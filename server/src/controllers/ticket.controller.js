const { pool } = require('../config/db');
const { getIO, getBotRoom } = require('../config/socket');

async function listTickets(req, res) {
  try {
    if (!req.bot) return res.json({ tickets: [] });
    const { status, priority } = req.query;

    const params = [req.bot.id];
    let where = 'WHERE bot_id = ?';

    if (status && status !== 'all') {
      where += ' AND status = ?';
      params.push(status);
    }
    if (priority && priority !== 'all') {
      where += ' AND priority = ?';
      params.push(priority);
    }

    const [tickets] = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY created_at DESC`,
      params
    );
    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load tickets' });
  }
}

async function createTicket(req, res) {
  try {
    const { chat_id, visitor_name, visitor_email, subject, description, priority, sentiment } =
      req.body || {};

    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const safePriority = ['low', 'medium', 'high', 'urgent'].includes(priority)
      ? priority
      : 'medium';
    const safeSentiment = ['happy', 'neutral', 'angry'].includes(sentiment)
      ? sentiment
      : 'neutral';

    const [result] = await pool.query(
      `INSERT INTO tickets (bot_id, chat_id, visitor_name, visitor_email, subject, description, priority, status, sentiment, assigned_agent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        req.bot.id,
        chat_id || null,
        visitor_name || 'Website Visitor',
        visitor_email || null,
        subject.trim().slice(0, 255),
        description.trim(),
        safePriority,
        safeSentiment,
        req.user.id,
      ]
    );

    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [result.insertId]);

    try {
      getIO().to(getBotRoom(req.bot.id)).emit('ticket:created', ticket);
    } catch {}

    return res.status(201).json({ ticket });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ message: 'Failed to create ticket' });
  }
}

async function updateTicketStatus(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const { status, priority } = req.body || {};

    const [[existing]] = await pool.query('SELECT * FROM tickets WHERE id = ? AND bot_id = ?', [
      ticketId,
      req.bot.id,
    ]);
    if (!existing) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const nextStatus = ['open', 'in_progress', 'resolved', 'closed'].includes(status)
      ? status
      : existing.status;
    const nextPriority = ['low', 'medium', 'high', 'urgent'].includes(priority)
      ? priority
      : existing.priority;

    await pool.query('UPDATE tickets SET status = ?, priority = ? WHERE id = ?', [
      nextStatus,
      nextPriority,
      ticketId,
    ]);

    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    return res.json({ ticket });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update ticket' });
  }
}

async function deleteTicket(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM tickets WHERE id = ? AND bot_id = ?', [
      ticketId,
      req.bot.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete ticket' });
  }
}

module.exports = {
  listTickets,
  createTicket,
  updateTicketStatus,
  deleteTicket,
};
