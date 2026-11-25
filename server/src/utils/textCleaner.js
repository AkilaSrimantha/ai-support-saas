const cheerio = require('cheerio');

/**
 * Remove scripts, styles, nav/footer boilerplate and normalize whitespace
 * to produce clean text suitable for chunking and RAG retrieval.
 */
function cleanHtmlToText(html) {
  const $ = cheerio.load(html);

  const title = ($('title').first().text() || $('h1').first().text() || '').trim();

  $('script, style, noscript, iframe, svg, canvas, nav, footer, header').remove();

  const textParts = [];
  $('h1, h2, h3, h4, p, li, td, th, blockquote, pre').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length > 2) {
      textParts.push(t);
    }
  });

  const combined = (textParts.length > 0 ? textParts.join('\n') : $('body').text())
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: title.slice(0, 255) || 'Untitled Page',
    text: combined,
  };
}

/**
 * Split long cleaned text into overlapping chunks for RAG retrieval.
 */
function chunkText(text, maxChars = 900, overlap = 120) {
  if (!text) return [];
  const normalized = text.trim();
  if (normalized.length <= maxChars) return [normalized];

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const lastBreak = Math.max(
        normalized.lastIndexOf('\n', end),
        normalized.lastIndexOf('. ', end),
        normalized.lastIndexOf(' ', end)
      );
      if (lastBreak > start + Math.floor(maxChars * 0.5)) {
        end = lastBreak + 1;
      }
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for',
  'with', 'that', 'this', 'it', 'as', 'are', 'was', 'be', 'by', 'or', 'from',
  'your', 'you', 'we', 'our', 'can', 'how', 'what', 'when', 'where', 'why',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'about', 'if',
]);

function extractKeywords(text, limit = 15) {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
    .join(',');
}

module.exports = {
  cleanHtmlToText,
  chunkText,
  extractKeywords,
};
