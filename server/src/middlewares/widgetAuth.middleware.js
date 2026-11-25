const { pool } = require('../config/db');

function extractHostname(originOrReferer) {
  if (!originOrReferer) return '';
  try {
    return new URL(originOrReferer).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isDomainAllowed(allowedDomainsRaw, requestOrigin) {
  const raw = (allowedDomainsRaw || '').trim();
  if (!raw || raw === '*') return true;

  const host = extractHostname(requestOrigin);
  if (!host) return true; // Allow non-browser / direct script tests in dev

  const allowedList = raw
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0])
    .filter(Boolean);

  if (!allowedList.length || allowedList.includes('*')) return true;

  return allowedList.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

async function widgetAuthMiddleware(req, res, next) {
  try {
    const botKey = req.headers['x-bot-key'] || req.query.botKey || req.body?.botKey;
    if (!botKey) {
      return res.status(401).json({ message: 'Missing botKey' });
    }

    const [[bot]] = await pool.query('SELECT * FROM bots WHERE bot_key = ?', [botKey]);
    if (!bot) {
      return res.status(404).json({ message: 'Invalid widget botKey' });
    }

    const origin = req.headers.origin || req.headers.referer || '';
    if (!isDomainAllowed(bot.allowed_domains, origin)) {
      return res.status(403).json({ message: 'Domain not authorized for this widget' });
    }

    req.bot = bot;
    return next();
  } catch (err) {
    return res.status(500).json({ message: 'Widget authentication error' });
  }
}

module.exports = {
  widgetAuthMiddleware,
  isDomainAllowed,
};
