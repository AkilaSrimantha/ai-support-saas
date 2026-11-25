const { Server } = require('socket.io');

let ioInstance = null;

function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized');
  }
  return ioInstance;
}

function getBotRoom(botId) {
  return `bot:${botId}`;
}

function getChatRoom(chatId) {
  return `chat:${chatId}`;
}

module.exports = {
  initSocket,
  getIO,
  getBotRoom,
  getChatRoom,
};
