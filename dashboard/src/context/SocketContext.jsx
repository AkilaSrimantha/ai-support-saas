import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('saas_token');
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('agent:authenticate', { token });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('dashboard:handoff_alert', (data) => {
      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type: 'handoff',
          title: `Human Handoff Requested (Chat #${data.chatId})`,
          description: data.reason || 'AI escalated this chat to a human agent.',
          sentiment: data.sentiment,
          chatId: data.chatId,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev.slice(0, 19),
      ]);
    });

    newSocket.on('dashboard:angry_alert', (data) => {
      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type: 'angry',
          title: `😡 Angry Customer Alert (${data.visitorName || 'Visitor'})`,
          description: data.message?.slice(0, 100),
          sentiment: 'angry',
          chatId: data.chatId,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev.slice(0, 19),
      ]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <SocketContext.Provider value={{ socket, connected, notifications, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
