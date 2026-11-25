require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const registerChatSockets = require('./src/sockets/chat.socket');
const registerAgentSockets = require('./src/sockets/agent.socket');

const PORT = Number(process.env.PORT || 5000);

async function bootstrap() {
  const server = http.createServer(app);
  const io = initSocket(server);

  io.on('connection', (socket) => {
    registerAgentSockets(io, socket);
    registerChatSockets(io, socket);
  });

  try {
    await testConnection();
  } catch (err) {
    console.warn('⚠️ MySQL connection warning (ensure MySQL is running & schema.sql imported):', err.message);
  }

  server.listen(PORT, () => {
    console.log(`🚀 AI Support SaaS Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
