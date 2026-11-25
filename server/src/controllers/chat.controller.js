const { pool } = require('../config/db');
const { getIO, getBotRoom, getChatRoom } = require('../config/socket');

async function getOverviewAnalytics(req, res) {
  try {
    if (!req.bot) {
      return res.json({
        stats: {
          totalChats: 0,
          aiResolved: 0,
          aiResolutionRate: 0,
          humanHandoffs: 0,
          angryAlerts: 0,
          openTickets: 0,
          trainedSources: 0,
        },
        recentAngryChats: [],
      });
    }

    const botId = req.bot.id;

    const [[chatCounts]] = await pool.query(
      `SELECT
        COUNT(*) AS totalChats,
        SUM(CASE WHEN status = 'ai_active' OR (status = 'resolved' AND assigned_agent_id IS NULL) THEN 1 ELSE 0 END) AS aiHandled,
        SUM(CASE WHEN status = 'human_handoff' THEN 1 ELSE 0 END) AS humanHandoffs,
        SUM(CASE WHEN sentiment = 'angry' THEN 1 ELSE 0 END) AS angryAlerts
       FROM chats WHERE bot_id = ?`,
      [botId]
    );

    const [[ticketCounts]] = await pool.query(
      `SELECT COUNT(*) AS openTickets FROM tickets WHERE bot_id = ? AND status IN ('open', 'in_progress')`,
      [botId]
    );

    const [[knowledgeCounts]] = await pool.query(
      `SELECT COUNT(*) AS trainedSources FROM knowledge_sources WHERE bot_id = ? AND status = 'trained'`,
      [botId]
    );

    const [recentAngryChats] = await pool.query(
      `SELECT c.*,
        (SELECT content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM chats c
       WHERE c.bot_id = ? AND c.sentiment = 'angry'
       ORDER BY c.last_message_at DESC
       LIMIT 5`,
      [botId]
    );

    const total = Number(chatCounts.totalChats || 0);
    const aiHandled = Number(chatCounts.aiHandled || 0);
    const aiResolutionRate = total > 0 ? Math.round((aiHandled / total) * 100) : 0;

    return res.json({
      stats: {
        totalChats: total,
        aiResolved: aiHandled,
        aiResolutionRate,
        humanHandoffs: Number(chatCounts.humanHandoffs || 0),
        angryAlerts: Number(chatCounts.angryAlerts || 0),
        openTickets: Number(ticketCounts.openTickets || 0),
        trainedSources: Number(knowledgeCounts.trainedSources || 0),
      },
      recentAngryChats,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ message: 'Failed to load analytics' });
  }
}

async function listChats(req, res) {
  try {
    if (!req.bot) return res.json({ chats: [] });
    const { status, sentiment } = req.query;

    const params = [req.bot.id];
    let where = 'WHERE c.bot_id = ?';

    if (status && status !== 'all') {
      where += ' AND c.status = ?';
      params.push(status);
    }
    if (sentiment && sentiment !== 'all') {
      where += ' AND c.sentiment = ?';
      params.push(sentiment);
    }

    const [chats] = await pool.query(
      `SELECT c.*,
        (SELECT content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS message_count
       FROM chats c
       ${where}
       ORDER BY c.last_message_at DESC`,
      params
    );

    return res.json({ chats });
  } catch (err) {
    console.error('List chats error:', err);
    return res.status(500).json({ message: 'Failed to load chats' });
  }
}

async function getChatMessages(req, res) {
  try {
    const chatId = Number(req.params.id);
    const [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ? AND bot_id = ?', [
      chatId,
      req.bot.id,
    ]);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const [messages] = await pool.query(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC',
      [chatId]
    );
    return res.json({ chat, messages });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load messages' });
  }
}

async function handoffToHuman(req, res) {
  try {
    const chatId = Number(req.params.id);
    const [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ? AND bot_id = ?', [
      chatId,
      req.bot.id,
    ]);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const reason = req.body?.reason || 'Agent took over conversation';
    await pool.query(
      `UPDATE chats SET status = 'human_handoff', assigned_agent_id = ?, handoff_reason = ? WHERE id = ?`,
      [req.user.id, reason, chatId]
    );

    const systemText = `${req.user.name} (Human Agent) joined the chat.`;
    const [msgRes] = await pool.query(
      `INSERT INTO messages (chat_id, sender_type, sender_id, content) VALUES (?, 'system', ?, ?)`,
      [chatId, req.user.id, systemText]
    );

    const [[sysMsg]] = await pool.query('SELECT * FROM messages WHERE id = ?', [msgRes.insertId]);
    const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chatId]);

    const io = getIO();
    io.to(getChatRoom(chatId)).emit('chat:message', sysMsg);
    io.to(getChatRoom(chatId)).emit('chat:status_changed', {
      chatId,
      status: 'human_handoff',
      agentName: req.user.name,
    });
    io.to(getBotRoom(req.bot.id)).emit('dashboard:chat_updated', updatedChat);

    return res.json({ chat: updatedChat, systemMessage: sysMsg });
  } catch (err) {
    console.error('Handoff error:', err);
    return res.status(500).json({ message: 'Failed to take over chat' });
  }
}

async function returnToAi(req, res) {
  try {
    const chatId = Number(req.params.id);
    const [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ? AND bot_id = ?', [
      chatId,
      req.bot.id,
    ]);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await pool.query(`UPDATE chats SET status = 'ai_active' WHERE id = ?`, [chatId]);

    const [msgRes] = await pool.query(
      `INSERT INTO messages (chat_id, sender_type, content) VALUES (?, 'system', 'AI Assistant resumed handling this conversation.')`,
      [chatId]
    );
    const [[sysMsg]] = await pool.query('SELECT * FROM messages WHERE id = ?', [msgRes.insertId]);
    const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chatId]);

    const io = getIO();
    io.to(getChatRoom(chatId)).emit('chat:message', sysMsg);
    io.to(getChatRoom(chatId)).emit('chat:status_changed', { chatId, status: 'ai_active' });
    io.to(getBotRoom(req.bot.id)).emit('dashboard:chat_updated', updatedChat);

    return res.json({ chat: updatedChat });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to return chat to AI' });
  }
}

async function resolveChat(req, res) {
  try {
    const chatId = Number(req.params.id);
    const [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ? AND bot_id = ?', [
      chatId,
      req.bot.id,
    ]);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await pool.query(`UPDATE chats SET status = 'resolved' WHERE id = ?`, [chatId]);
    const [msgRes] = await pool.query(
      `INSERT INTO messages (chat_id, sender_type, content) VALUES (?, 'system', 'Conversation marked as resolved.')`,
      [chatId]
    );

    const [[sysMsg]] = await pool.query('SELECT * FROM messages WHERE id = ?', [msgRes.insertId]);
    const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chatId]);

    const io = getIO();
    io.to(getChatRoom(chatId)).emit('chat:message', sysMsg);
    io.to(getChatRoom(chatId)).emit('chat:status_changed', { chatId, status: 'resolved' });
    io.to(getBotRoom(req.bot.id)).emit('dashboard:chat_updated', updatedChat);

    return res.json({ chat: updatedChat });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to resolve chat' });
  }
}

async function sendAgentMessage(req, res) {
  try {
    const chatId = Number(req.params.id);
    const { content } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ? AND bot_id = ?', [
      chatId,
      req.bot.id,
    ]);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.status !== 'human_handoff') {
      await pool.query(
        `UPDATE chats SET status = 'human_handoff', assigned_agent_id = ? WHERE id = ?`,
        [req.user.id, chatId]
      );
    }

    const [msgRes] = await pool.query(
      `INSERT INTO messages (chat_id, sender_type, sender_id, content) VALUES (?, 'agent', ?, ?)`,
      [chatId, req.user.id, content.trim()]
    );
    await pool.query('UPDATE chats SET last_message_at = NOW() WHERE id = ?', [chatId]);

    const [[message]] = await pool.query('SELECT * FROM messages WHERE id = ?', [msgRes.insertId]);
    const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chatId]);

    const io = getIO();
    io.to(getChatRoom(chatId)).emit('chat:message', message);
    io.to(getBotRoom(req.bot.id)).emit('dashboard:chat_updated', updatedChat);

    return res.status(201).json({ message, chat: updatedChat });
  } catch (err) {
    console.error('Send agent message error:', err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
}

module.exports = {
  getOverviewAnalytics,
  listChats,
  getChatMessages,
  handoffToHuman,
  returnToAi,
  resolveChat,
  sendAgentMessage,
};
