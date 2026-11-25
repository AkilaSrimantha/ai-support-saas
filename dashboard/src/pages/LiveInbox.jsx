import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import CustomerInfo from '../components/chat/CustomerInfo';

export default function LiveInbox() {
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const { socket } = useSocket();

  const fetchChats = async () => {
    const res = await api.get('/chats', {
      params: { status: statusFilter, sentiment: sentimentFilter },
    });
    const list = res.data.chats || [];
    setChats(list);

    const paramId = Number(searchParams.get('chatId'));
    if (paramId && !selectedChat) {
      const target = list.find((c) => c.id === paramId);
      if (target) handleSelectChat(target);
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    const res = await api.get(`/chats/${chat.id}/messages`);
    setSelectedChat(res.data.chat);
    setMessages(res.data.messages || []);
    socket?.emit('agent:join_chat', { chatId: chat.id });
  };

  useEffect(() => {
    fetchChats();
  }, [statusFilter, sentimentFilter]);

  useEffect(() => {
    if (!socket) return;

    const onChatCreated = (newChat) => {
      setChats((prev) => [newChat, ...prev.filter((c) => c.id !== newChat.id)]);
    };

    const onChatUpdated = (updated) => {
      setChats((prev) => {
        const exists = prev.some((c) => c.id === updated.id);
        const merged = exists
          ? prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          : [updated, ...prev];
        return [...merged].sort(
          (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)
        );
      });
      setSelectedChat((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    };

    const onNewMessage = ({ chatId, message }) => {
      setSelectedChat((current) => {
        if (current && current.id === chatId) {
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
        }
        return current;
      });
    };

    const onChatMessage = (message) => {
      setSelectedChat((current) => {
        if (current && current.id === message.chat_id) {
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
        }
        return current;
      });
    };

    socket.on('dashboard:chat_created', onChatCreated);
    socket.on('dashboard:chat_updated', onChatUpdated);
    socket.on('dashboard:new_message', onNewMessage);
    socket.on('chat:message', onChatMessage);

    return () => {
      socket.off('dashboard:chat_created', onChatCreated);
      socket.off('dashboard:chat_updated', onChatUpdated);
      socket.off('dashboard:new_message', onNewMessage);
      socket.off('chat:message', onChatMessage);
    };
  }, [socket]);

  const handleSendMessage = async (content) => {
    if (!selectedChat) return;
    const res = await api.post(`/chats/${selectedChat.id}/messages`, { content });
    setSelectedChat(res.data.chat);
    setMessages((prev) =>
      prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]
    );
  };

  const handleTakeOver = async () => {
    if (!selectedChat) return;
    const res = await api.post(`/chats/${selectedChat.id}/handoff`, {});
    setSelectedChat(res.data.chat);
  };

  const handleReturnToAi = async () => {
    if (!selectedChat) return;
    const res = await api.post(`/chats/${selectedChat.id}/return-to-ai`);
    setSelectedChat(res.data.chat);
  };

  const handleResolve = async () => {
    if (!selectedChat) return;
    const res = await api.post(`/chats/${selectedChat.id}/resolve`);
    setSelectedChat(res.data.chat);
  };

  const handleCreateTicket = async () => {
    if (!selectedChat) return;
    const subject = window.prompt(
      'Ticket Subject:',
      `Support Follow-up: ${selectedChat.visitor_name || `Chat #${selectedChat.id}`}`
    );
    if (!subject) return;

    const lastMsg = messages[messages.length - 1]?.content || 'Manual ticket escalated from live chat';
    await api.post('/tickets', {
      chat_id: selectedChat.id,
      visitor_name: selectedChat.visitor_name,
      visitor_email: selectedChat.visitor_email,
      subject,
      description: lastMsg,
      priority: selectedChat.sentiment === 'angry' ? 'urgent' : 'high',
      sentiment: selectedChat.sentiment,
    });
    window.alert('Ticket created successfully!');
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left Conversation List */}
      <div className="w-64 lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="flex gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="human_handoff">Human Handoff</option>
              <option value="ai_active">AI Active</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="all">All Sentiments</option>
              <option value="angry">😡 Angry</option>
              <option value="neutral">😐 Neutral</option>
              <option value="happy">😊 Happy</option>
            </select>
          </div>
        </div>

        <ChatList chats={chats} selectedId={selectedChat?.id} onSelect={handleSelectChat} />
      </div>

      {/* Center Live Chat */}
      <ChatWindow
        chat={selectedChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        onTakeOver={handleTakeOver}
        onReturnToAi={handleReturnToAi}
        onResolve={handleResolve}
        onCreateTicket={handleCreateTicket}
        onTyping={(isTyping) =>
          selectedChat && socket?.emit('agent:typing', { chatId: selectedChat.id, isTyping })
        }
      />

      {/* Right Customer Info */}
      <CustomerInfo chat={selectedChat} />
    </div>
  );
}
