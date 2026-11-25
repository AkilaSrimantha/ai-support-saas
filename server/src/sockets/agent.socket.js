const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { getBotRoom } = require('../config/socket');

function registerAgentSockets(io, socket) {
  socket.on('agent:authenticate', async ({ token }, ack) => {
    try {
      if (!token) return ack?.({ error: 'Missing token' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      const [[user]] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [
        decoded.userId,
      ]);
      if (!user) return ack?.({ error: 'Invalid user' });

      const [[bot]] = await pool.query('SELECT id, name, bot_key FROM bots WHERE user_id = ? LIMIT 1', [
        user.id,
      ]);

      socket.data.userId = user.id;
      socket.data.botId = bot?.id;
      socket.data.role = 'agent';

      if (bot) {
        socket.join(getBotRoom(bot.id));
      }

      await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]);
      if (bot) {
        io.to(getBotRoom(bot.id)).emit('agent:status_changed', {
          userId: user.id,
          isOnline: true,
        });
      }

      return ack?.({ ok: true, user, bot });
    } catch (err) {
      return ack?.({ error: 'Socket authentication failed' });
    }
  });

  socket.on('agent:set_online', async ({ isOnline }) => {
    if (!socket.data.userId) return;
    const statusVal = isOnline ? 1 : 0;
    await pool.query('UPDATE users SET is_online = ? WHERE id = ?', [
      statusVal,
      socket.data.userId,
    ]);
    if (socket.data.botId) {
      io.to(getBotRoom(socket.data.botId)).emit('agent:status_changed', {
        userId: socket.data.userId,
        isOnline: Boolean(statusVal),
      });
    }
  });

  socket.on('disconnect', async () => {
    if (socket.data.role === 'agent' && socket.data.userId) {
      try {
        await pool.query('UPDATE users SET is_online = 0 WHERE id = ?', [socket.data.userId]);
        if (socket.data.botId) {
          io.to(getBotRoom(socket.data.botId)).emit('agent:status_changed', {
            userId: socket.data.userId,
            isOnline: false,
          });
        }
      } catch {}
    }
  });
}

module.exports = registerAgentSockets;
