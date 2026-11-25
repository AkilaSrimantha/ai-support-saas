const crypto = require('crypto');
const { pool } = require('../config/db');

async function getBotSettings(req, res) {
  if (!req.bot) {
    return res.status(404).json({ message: 'Bot not found for this account' });
  }
  return res.json({ bot: req.bot });
}

async function updateBotSettings(req, res) {
  try {
    if (!req.bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    const {
      name,
      primary_color,
      welcome_message,
      position,
      allowed_domains,
      system_prompt,
    } = req.body || {};

    const nextName = (name ?? req.bot.name).trim().slice(0, 120);
    const nextColor = (primary_color ?? req.bot.primary_color).trim().slice(0, 20);
    const nextWelcome = (welcome_message ?? req.bot.welcome_message).trim().slice(0, 500);
    const nextPosition = ['bottom-right', 'bottom-left'].includes(position)
      ? position
      : req.bot.position;
    const nextDomains = allowed_domains !== undefined ? String(allowed_domains).trim() : req.bot.allowed_domains;
    const nextPrompt = system_prompt !== undefined ? String(system_prompt).trim() : req.bot.system_prompt;

    await pool.query(
      `UPDATE bots
       SET name = ?, primary_color = ?, welcome_message = ?, position = ?, allowed_domains = ?, system_prompt = ?
       WHERE id = ?`,
      [nextName, nextColor, nextWelcome, nextPosition, nextDomains, nextPrompt, req.bot.id]
    );

    const [[updated]] = await pool.query('SELECT * FROM bots WHERE id = ?', [req.bot.id]);
    return res.json({ bot: updated });
  } catch (err) {
    console.error('Update bot error:', err);
    return res.status(500).json({ message: 'Failed to update bot settings' });
  }
}

async function regenerateBotKey(req, res) {
  try {
    if (!req.bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    const newKey = `pk_live_${crypto.randomBytes(16).toString('hex')}`;
    await pool.query('UPDATE bots SET bot_key = ? WHERE id = ?', [newKey, req.bot.id]);
    const [[updated]] = await pool.query('SELECT * FROM bots WHERE id = ?', [req.bot.id]);
    return res.json({ bot: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to regenerate key' });
  }
}

async function getPublicWidgetConfig(req, res) {
  const bot = req.bot;
  return res.json({
    botKey: bot.bot_key,
    name: bot.name,
    primaryColor: bot.primary_color,
    welcomeMessage: bot.welcome_message,
    position: bot.position,
  });
}

module.exports = {
  getBotSettings,
  updateBotSettings,
  regenerateBotKey,
  getPublicWidgetConfig,
};
