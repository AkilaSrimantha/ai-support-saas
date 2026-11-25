const { pool } = require('../config/db');
const { getBotRoom, getChatRoom } = require('../config/socket');
const { generateSupportReply } = require('../services/gemini.service');
const { isDomainAllowed } = require('../middlewares/widgetAuth.middleware');

function registerChatSockets(io, socket) {
  /**
   * Widget visitor joins or initializes a chat session
   * Payload: { botKey, visitorId, visitorName, visitorEmail, pageUrl }
   */
  socket.on('widget:join', async (payload = {}, ack) => {
    try {
      const { botKey, visitorId, visitorName, visitorEmail, pageUrl } = payload;
      if (!botKey || !visitorId) {
        return ack?.({ error: 'botKey and visitorId are required' });
      }

      const [[bot]] = await pool.query('SELECT * FROM bots WHERE bot_key = ?', [botKey]);
      if (!bot) {
        return ack?.({ error: 'Invalid botKey' });
      }

      const origin = socket.handshake.headers?.origin || pageUrl || '';
      if (!isDomainAllowed(bot.allowed_domains, origin)) {
        return ack?.({ error: 'Domain not authorized for this widget' });
      }

      let [[chat]] = await pool.query(
        'SELECT * FROM chats WHERE bot_id = ? AND visitor_id = ?',
        [bot.id, visitorId]
      );

      let isNew = false;
      if (!chat) {
        isNew = true;
        const [insertRes] = await pool.query(
          `INSERT INTO chats (bot_id, visitor_id, visitor_name, visitor_email, page_url, status, sentiment)
           VALUES (?, ?, ?, ?, ?, 'ai_active', 'neutral')`,
          [
            bot.id,
            visitorId,
            visitorName || 'Website Visitor',
            visitorEmail || null,
            pageUrl || null,
          ]
        );
        [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [insertRes.insertId]);

        await pool.query(
          `INSERT INTO messages (chat_id, sender_type, content) VALUES (?, 'ai', ?)`,
          [chat.id, bot.welcome_message]
        );
      } else if (visitorName || visitorEmail || pageUrl) {
        await pool.query(
          `UPDATE chats SET
            visitor_name = COALESCE(?, visitor_name),
            visitor_email = COALESCE(?, visitor_email),
            page_url = COALESCE(?, page_url)
           WHERE id = ?`,
          [visitorName || null, visitorEmail || null, pageUrl || null, chat.id]
        );
        [[chat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chat.id]);
      }

      socket.join(getChatRoom(chat.id));
      socket.data.chatId = chat.id;
      socket.data.botId = bot.id;
      socket.data.role = 'visitor';

      const [messages] = await pool.query(
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC',
        [chat.id]
      );

      if (isNew) {
        io.to(getBotRoom(bot.id)).emit('dashboard:chat_created', {
          ...chat,
          last_message: bot.welcome_message,
        });
      }

      return ack?.({
        chat,
        messages,
        botConfig: {
          name: bot.name,
          primaryColor: bot.primary_color,
          welcomeMessage: bot.welcome_message,
          position: bot.position,
        },
      });
    } catch (err) {
      console.error('widget:join error:', err);
      return ack?.({ error: 'Failed to join chat' });
    }
  });

  /**
   * Visitor sends a message
   * Payload: { botKey, visitorId, content, visitorName, visitorEmail }
   */
  socket.on('widget:message', async (payload = {}, ack) => {
    try {
      const { botKey, visitorId, content, visitorName, visitorEmail } = payload;
      const trimmed = (content || '').trim();
      if (!botKey || !visitorId || !trimmed) {
        return ack?.({ error: 'Missing required message fields' });
      }

      const [[bot]] = await pool.query('SELECT * FROM bots WHERE bot_key = ?', [botKey]);
      if (!bot) return ack?.({ error: 'Invalid botKey' });

      const [[chat]] = await pool.query(
        'SELECT * FROM chats WHERE bot_id = ? AND visitor_id = ?',
        [bot.id, visitorId]
      );
      if (!chat) return ack?.({ error: 'Chat session not initialized' });

      if (visitorName || visitorEmail) {
        await pool.query(
          `UPDATE chats SET
            visitor_name = COALESCE(?, visitor_name),
            visitor_email = COALESCE(?, visitor_email)
           WHERE id = ?`,
          [visitorName || null, visitorEmail || null, chat.id]
        );
      }

      // 1. Persist visitor message
      const [userMsgRes] = await pool.query(
        `INSERT INTO messages (chat_id, sender_type, content) VALUES (?, 'visitor', ?)`,
        [chat.id, trimmed]
      );
      await pool.query('UPDATE chats SET last_message_at = NOW() WHERE id = ?', [chat.id]);

      const [[userMessage]] = await pool.query('SELECT * FROM messages WHERE id = ?', [
        userMsgRes.insertId,
      ]);

      io.to(getChatRoom(chat.id)).emit('chat:message', userMessage);
      io.to(getBotRoom(bot.id)).emit('dashboard:new_message', {
        chatId: chat.id,
        message: userMessage,
      });

      ack?.({ ok: true, message: userMessage });

      // 2. If human agent has already taken over, do NOT auto-reply with AI
      if (chat.status === 'human_handoff') {
        return;
      }

      // If chat was resolved and visitor writes again, reactivate AI
      if (chat.status === 'resolved') {
        await pool.query(`UPDATE chats SET status = 'ai_active' WHERE id = ?`, [chat.id]);
      }

      // 3. Emit AI typing indicator
      io.to(getChatRoom(chat.id)).emit('chat:typing', { chatId: chat.id, isTyping: true, sender: 'ai' });

      const [history] = await pool.query(
        'SELECT sender_type, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC LIMIT 20',
        [chat.id]
      );

      const aiResult = await generateSupportReply({
        bot,
        history,
        userMessage: trimmed,
      });

      // Update visitor message & chat sentiment
      await pool.query('UPDATE messages SET sentiment = ? WHERE id = ?', [
        aiResult.sentiment,
        userMessage.id,
      ]);
      await pool.query(
        `UPDATE chats SET sentiment = ?, sentiment_score = ?, last_message_at = NOW() WHERE id = ?`,
        [aiResult.sentiment, aiResult.sentimentScore, chat.id]
      );

      // Save AI response
      const [aiMsgRes] = await pool.query(
        `INSERT INTO messages (chat_id, sender_type, content, sentiment) VALUES (?, 'ai', ?, ?)`,
        [chat.id, aiResult.reply, aiResult.sentiment]
      );
      const [[aiMessage]] = await pool.query('SELECT * FROM messages WHERE id = ?', [aiMsgRes.insertId]);

      io.to(getChatRoom(chat.id)).emit('chat:typing', { chatId: chat.id, isTyping: false, sender: 'ai' });
      io.to(getChatRoom(chat.id)).emit('chat:message', aiMessage);

      // 4. Handle Human Handoff & automatic Ticket creation when AI cannot resolve or user is angry
      if (aiResult.needsHandoff) {
        const reason = aiResult.handoffReason || 'AI escalated conversation to human agent';
        await pool.query(
          `UPDATE chats SET status = 'human_handoff', handoff_reason = ? WHERE id = ?`,
          [reason, chat.id]
        );

        const [ticketRes] = await pool.query(
          `INSERT INTO tickets (bot_id, chat_id, visitor_name, visitor_email, subject, description, priority, status, sentiment)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
          [
            bot.id,
            chat.id,
            visitorName || chat.visitor_name || 'Website Visitor',
            visitorEmail || chat.visitor_email || null,
            `Escalated Chat #${chat.id}: ${trimmed.slice(0, 80)}`,
            `Handoff Reason: ${reason}\n\nLatest Customer Message:\n${trimmed}`,
            aiResult.sentiment === 'angry' ? 'urgent' : 'high',
            aiResult.sentiment,
          ]
        );
        const [[newTicket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [
          ticketRes.insertId,
        ]);

        io.to(getChatRoom(chat.id)).emit('chat:status_changed', {
          chatId: chat.id,
          status: 'human_handoff',
          reason,
        });
        io.to(getBotRoom(bot.id)).emit('dashboard:handoff_alert', {
          chatId: chat.id,
          sentiment: aiResult.sentiment,
          reason,
          ticket: newTicket,
        });
        io.to(getBotRoom(bot.id)).emit('ticket:created', newTicket);
      }

      if (aiResult.sentiment === 'angry') {
        io.to(getBotRoom(bot.id)).emit('dashboard:angry_alert', {
          chatId: chat.id,
          visitorName: visitorName || chat.visitor_name,
          message: trimmed,
        });
      }

      const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chat.id]);
      io.to(getBotRoom(bot.id)).emit('dashboard:chat_updated', {
        ...updatedChat,
        last_message: aiMessage.content,
      });
    } catch (err) {
      console.error('widget:message error:', err);
      io.to(getChatRoom(socket.data.chatId)).emit('chat:typing', {
        chatId: socket.data.chatId,
        isTyping: false,
      });
      ack?.({ error: 'Failed to process message' });
    }
  });

  /**
   * Visitor manually clicks "Talk to Human" in widget
   */
  socket.on('widget:request_handoff', async (payload = {}, ack) => {
    try {
      const { botKey, visitorId, reason } = payload;
      const [[bot]] = await pool.query('SELECT * FROM bots WHERE bot_key = ?', [botKey]);
      if (!bot) return ack?.({ error: 'Invalid botKey' });

      const [[chat]] = await pool.query(
        'SELECT * FROM chats WHERE bot_id = ? AND visitor_id = ?',
        [bot.id, visitorId]
      );
      if (!chat) return ack?.({ error: 'Chat not found' });

      const handoffReason = reason || 'Visitor requested a human agent';
      await pool.query(
        `UPDATE chats SET status = 'human_handoff', handoff_reason = ? WHERE id = ?`,
        [handoffReason, chat.id]
      );

      const [sysRes] = await pool.query(
        `INSERT INTO messages (chat_id, sender_type, content)
         VALUES (?, 'system', 'You requested a human agent. A support specialist has been notified and will join shortly.')`,
        [chat.id]
      );
      const [[sysMsg]] = await pool.query('SELECT * FROM messages WHERE id = ?', [sysRes.insertId]);

      const [ticketRes] = await pool.query(
        `INSERT INTO tickets (bot_id, chat_id, visitor_name, visitor_email, subject, description, priority, status, sentiment)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          bot.id,
          chat.id,
          chat.visitor_name,
          chat.visitor_email,
          `Human Handoff Request (Chat #${chat.id})`,
          handoffReason,
          chat.sentiment === 'angry' ? 'urgent' : 'high',
          chat.sentiment,
        ]
      );
      const [[newTicket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [
        ticketRes.insertId,
      ]);

      const [[updatedChat]] = await pool.query('SELECT * FROM chats WHERE id = ?', [chat.id]);

      io.to(getChatRoom(chat.id)).emit('chat:message', sysMsg);
      io.to(getChatRoom(chat.id)).emit('chat:status_changed', {
        chatId: chat.id,
        status: 'human_handoff',
        reason: handoffReason,
      });
      io.to(getBotRoom(bot.id)).emit('dashboard:handoff_alert', {
        chatId: chat.id,
        sentiment: chat.sentiment,
        reason: handoffReason,
        ticket: newTicket,
      });
      io.to(getBotRoom(bot.id)).emit('dashboard:chat_updated', updatedChat);
      io.to(getBotRoom(bot.id)).emit('ticket:created', newTicket);

      ack?.({ ok: true, chat: updatedChat });
    } catch (err) {
      console.error('widget:request_handoff error:', err);
      ack?.({ error: 'Failed to request human handoff' });
    }
  });

  /**
   * Dashboard agent joins a specific chat room to view & reply in real time
   */
  socket.on('agent:join_chat', ({ chatId }) => {
    if (chatId) {
      socket.join(getChatRoom(chatId));
    }
  });

  socket.on('agent:typing', ({ chatId, isTyping }) => {
    if (chatId) {
      socket.to(getChatRoom(chatId)).emit('chat:typing', {
        chatId,
        isTyping: Boolean(isTyping),
        sender: 'agent',
      });
    }
  });
}

module.exports = registerChatSockets;
