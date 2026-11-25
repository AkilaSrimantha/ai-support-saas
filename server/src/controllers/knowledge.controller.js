const { pool } = require('../config/db');
const { scrapeAndStoreUrl, storeManualFaq } = require('../services/scraper.service');

async function listSources(req, res) {
  try {
    if (!req.bot) return res.json({ sources: [] });
    const [sources] = await pool.query(
      'SELECT * FROM knowledge_sources WHERE bot_id = ? ORDER BY created_at DESC',
      [req.bot.id]
    );
    return res.json({ sources });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load knowledge sources' });
  }
}

async function scrapeUrl(req, res) {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ message: 'Website URL is required' });
    }
    const source = await scrapeAndStoreUrl({ botId: req.bot.id, url: url.trim() });
    return res.status(201).json({ source });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to scrape URL' });
  }
}

async function addFaq(req, res) {
  try {
    const { title, content } = req.body || {};
    const source = await storeManualFaq({ botId: req.bot.id, title, content });
    return res.status(201).json({ source });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to save FAQ' });
  }
}

async function rescrapeSource(req, res) {
  try {
    const sourceId = Number(req.params.id);
    const [[existing]] = await pool.query(
      'SELECT * FROM knowledge_sources WHERE id = ? AND bot_id = ?',
      [sourceId, req.bot.id]
    );
    if (!existing) {
      return res.status(404).json({ message: 'Knowledge source not found' });
    }
    if (existing.source_type !== 'url' || !existing.url) {
      return res.status(400).json({ message: 'Only URL sources can be re-scraped' });
    }

    await pool.query('DELETE FROM knowledge_sources WHERE id = ?', [sourceId]);
    const source = await scrapeAndStoreUrl({ botId: req.bot.id, url: existing.url });
    return res.json({ source });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to re-scrape URL' });
  }
}

async function deleteSource(req, res) {
  try {
    const sourceId = Number(req.params.id);
    const [result] = await pool.query(
      'DELETE FROM knowledge_sources WHERE id = ? AND bot_id = ?',
      [sourceId, req.bot.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Knowledge source not found' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete source' });
  }
}

module.exports = {
  listSources,
  scrapeUrl,
  addFaq,
  rescrapeSource,
  deleteSource,
};
