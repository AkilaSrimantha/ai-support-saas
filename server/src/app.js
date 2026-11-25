const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const botRoutes = require('./routes/bot.routes');
const knowledgeRoutes = require('./routes/knowledge.routes');
const chatRoutes = require('./routes/chat.routes');
const ticketRoutes = require('./routes/ticket.routes');

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-key'],
  })
);
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-support-saas-server', timestamp: new Date().toISOString() });
});

// Serve the compiled single-file embeddable widget.js
app.get('/widget.js', (req, res) => {
  const widgetDistPath = path.resolve(__dirname, '../../widget/dist/widget.js');
  if (!fs.existsSync(widgetDistPath)) {
    return res
      .status(404)
      .type('application/javascript')
      .send('console.error("AISupportWidget: widget.js is not built yet. Run npm run build inside widget/");');
  }
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.sendFile(widgetDistPath);
});

// Quick interactive demo page to test the 2-line embed code
app.get('/demo', (req, res) => {
  const botKey = req.query.botKey || 'pk_live_demo';
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Widget Embed Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 48px 24px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(15,23,42,0.06); }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
    pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 12px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Client Website Demo</h1>
    <p>This page simulates any external website embedding your AI Support Widget using the 2-line script snippet below:</p>
    <pre>&lt;script&gt;window.AISupportConfig = { botKey: "${botKey}", serverUrl: "${serverUrl}" };&lt;/script&gt;
&lt;script src="${serverUrl}/widget.js" async&gt;&lt;/script&gt;</pre>
    <p>Look at the bottom corner to open the Shadow DOM chat widget!</p>
  </div>

  <script>window.AISupportConfig = { botKey: "${botKey}", serverUrl: "${serverUrl}" };</script>
  <script src="${serverUrl}/widget.js" async></script>
</body>
</html>`);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
