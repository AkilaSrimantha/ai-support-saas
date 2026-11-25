const { pool } = require('../config/db');

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Retrieve the top matching knowledge chunks for a bot based on keyword + phrase overlap.
 */
async function retrieveRelevantContext(botId, query, topK = 5) {
  const [rows] = await pool.query(
    `SELECT kc.id, kc.content, kc.keywords, ks.title, ks.url, ks.source_type
     FROM knowledge_chunks kc
     INNER JOIN knowledge_sources ks ON ks.id = kc.source_id
     WHERE kc.bot_id = ? AND ks.status = 'trained'`,
    [botId]
  );

  if (!rows.length) {
    return [];
  }

  const queryTokens = tokenize(query);
  const lowerQuery = (query || '').toLowerCase().trim();

  const scored = rows.map((row) => {
    const contentLower = row.content.toLowerCase();
    const keywordSet = new Set((row.keywords || '').split(',').filter(Boolean));
    let score = 0;

    for (const token of queryTokens) {
      if (contentLower.includes(token)) {
        score += 2;
      }
      if (keywordSet.has(token)) {
        score += 1.5;
      }
    }

    if (lowerQuery.length > 5 && contentLower.includes(lowerQuery)) {
      score += 6;
    }

    return {
      ...row,
      score,
    };
  });

  const relevant = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // If no strong keyword hit, return up to 2 chunks as general context
  if (!relevant.length) {
    return scored.slice(0, 2);
  }

  return relevant;
}

module.exports = {
  retrieveRelevantContext,
};
