import { io } from 'socket.io-client';

export function createWidgetSocket(serverUrl) {
  return io(serverUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}
