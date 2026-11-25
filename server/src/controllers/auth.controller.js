const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  const { name, email, password, botName } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const conn = await pool.getConnection();

  try {
    const [[existing]] = await conn.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    await conn.beginTransaction();
    const passwordHash = await bcrypt.hash(password, 10);

    const [userRes] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, is_online)
       VALUES (?, ?, ?, 'admin', 1)`,
      [name.trim(), normalizedEmail, passwordHash]
    );
    const userId = userRes.insertId;

    const botKey = `pk_live_${crypto.randomBytes(16).toString('hex')}`;
    const defaultBotName = (botName || `${name.trim()} AI Support`).slice(0, 120);

    const [botRes] = await conn.query(
      `INSERT INTO bots (user_id, name, bot_key, primary_color, welcome_message, position, allowed_domains)
       VALUES (?, ?, ?, '#4f46e5', 'Hi! 👋 How can I help you today?', 'bottom-right', '*')`,
      [userId, defaultBotName, botKey]
    );

    await conn.commit();

    const [[user]] = await pool.query(
      'SELECT id, name, email, role, is_online, created_at FROM users WHERE id = ?',
      [userId]
    );
    const [[bot]] = await pool.query('SELECT * FROM bots WHERE id = ?', [botRes.insertId]);

    const token = signToken(userId);
    return res.status(201).json({ token, user, bot });
  } catch (err) {
    await conn.rollback();
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Failed to register tenant' });
  } finally {
    conn.release();
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [[userRow]] = await pool.query('SELECT * FROM users WHERE email = ?', [
      email.trim().toLowerCase(),
    ]);

    if (!userRow) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [userRow.id]);

    const [[bot]] = await pool.query('SELECT * FROM bots WHERE user_id = ? ORDER BY id ASC LIMIT 1', [
      userRow.id,
    ]);

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      is_online: 1,
      created_at: userRow.created_at,
    };

    const token = signToken(userRow.id);
    return res.json({ token, user, bot });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function me(req, res) {
  return res.json({
    user: req.user,
    bot: req.bot,
  });
}

async function toggleOnlineStatus(req, res) {
  try {
    const isOnline = req.body?.is_online ? 1 : 0;
    await pool.query('UPDATE users SET is_online = ? WHERE id = ?', [isOnline, req.user.id]);
    return res.json({ is_online: Boolean(isOnline) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

module.exports = {
  register,
  login,
  me,
  toggleOnlineStatus,
};
