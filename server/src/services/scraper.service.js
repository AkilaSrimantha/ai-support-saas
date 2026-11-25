const { pool } = require('../config/db');
const { cleanHtmlToText, chunkText, extractKeywords } = require('../utils/textCleaner');

function validatePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }

  const host = parsed.hostname.toLowerCase();
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    throw new Error('Blocked internal metadata host');
  }

  return parsed.toString();
}

async function scrapeAndStoreUrl({ botId, url }) {
  const validUrl = validatePublicUrl(url);

  const [insertRes] = await pool.query(
    `INSERT INTO knowledge_sources (bot_id, source_type, url, title, status)
     VALUES (?, 'url', ?, ?, 'pending')`,
    [botId, validUrl, validUrl]
  );
  const sourceId = insertRes.insertId;

  try {
    const response = await fetch(validUrl, {
      headers: {
        'User-Agent': 'AISupportSaaSBot/1.0 (+https://support-saas.local)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();

    let title = validUrl;
    let cleanText = '';

    if (contentType.includes('text/plain') || contentType.includes('application/json')) {
      cleanText = rawBody.trim();
    } else {
      const parsed = cleanHtmlToText(rawBody);
      title = parsed.title || validUrl;
      cleanText = parsed.text;
    }

    if (!cleanText || cleanText.length < 20) {
      throw new Error('No readable text content found on this page');
    }

    const chunks = chunkText(cleanText, 900, 120);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM knowledge_chunks WHERE source_id = ?', [sourceId]);

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const keywords = extractKeywords(chunk);
        await conn.query(
          `INSERT INTO knowledge_chunks (source_id, bot_id, chunk_index, content, keywords)
           VALUES (?, ?, ?, ?, ?)`,
          [sourceId, botId, i, chunk, keywords]
        );
      }

      await conn.query(
        `UPDATE knowledge_sources
         SET title = ?, status = 'trained', chunk_count = ?, error_message = NULL, last_scraped_at = NOW()
         WHERE id = ?`,
        [title, chunks.length, sourceId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [[source]] = await pool.query('SELECT * FROM knowledge_sources WHERE id = ?', [sourceId]);
    return source;
  } catch (err) {
    await pool.query(
      `UPDATE knowledge_sources SET status = 'failed', error_message = ? WHERE id = ?`,
      [String(err.message || 'Scraping failed').slice(0, 490), sourceId]
    );
    throw err;
  }
}

async function storeManualFaq({ botId, title, content }) {
  const cleanTitle = (title || 'Custom FAQ').trim().slice(0, 255);
  const cleanContent = (content || '').trim();

  if (cleanContent.length < 10) {
    throw new Error('FAQ content must be at least 10 characters');
  }

  const chunks = chunkText(cleanContent, 900, 120);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [insertRes] = await conn.query(
      `INSERT INTO knowledge_sources (bot_id, source_type, url, title, status, chunk_count, last_scraped_at)
       VALUES (?, 'faq', NULL, ?, 'trained', ?, NOW())`,
      [botId, cleanTitle, chunks.length]
    );
    const sourceId = insertRes.insertId;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      await conn.query(
        `INSERT INTO knowledge_chunks (source_id, bot_id, chunk_index, content, keywords)
         VALUES (?, ?, ?, ?, ?)`,
        [sourceId, botId, i, chunk, extractKeywords(chunk)]
      );
    }

    await conn.commit();
    const [[source]] = await pool.query('SELECT * FROM knowledge_sources WHERE id = ?', [sourceId]);
    return source;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  scrapeAndStoreUrl,
  storeManualFaq,
};
