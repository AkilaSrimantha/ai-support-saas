const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const [[user]] = await pool.query(
      'SELECT id, name, email, role, is_online, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }

    const [[bot]] = await pool.query('SELECT * FROM bots WHERE user_id = ? ORDER BY id ASC LIMIT 1', [
      user.id,
    ]);

    req.user = user;
    req.bot = bot || null;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
