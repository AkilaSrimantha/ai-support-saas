import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  BookOpenCheck,
  Bot,
  Handshake,
  MessageSquare,
  Ticket,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function Overview() {
  const [stats, setStats] = useState({
    totalChats: 0,
    aiResolved: 0,
    aiResolutionRate: 0,
    humanHandoffs: 0,
    angryAlerts: 0,
    openTickets: 0,
    trainedSources: 0,
  });
  const [angryChats, setAngryChats] = useState([]);
  const { socket } = useSocket();

  const loadAnalytics = async () => {
    try {
      const res = await api.get('/chats/analytics/overview');
      setStats(res.data.stats);
      setAngryChats(res.data.recentAngryChats || []);
    } catch {}
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadAnalytics();
    socket.on('dashboard:chat_created', refresh);
    socket.on('dashboard:chat_updated', refresh);
    socket.on('ticket:created', refresh);
    return () => {
      socket.off('dashboard:chat_created', refresh);
      socket.off('dashboard:chat_updated', refresh);
      socket.off('ticket:created', refresh);
    };
  }, [socket]);

  const cards = [
    {
      label: 'Total Conversations',
      value: stats.totalChats,
      icon: MessageSquare,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'AI Resolution Rate',
      value: `${stats.aiResolutionRate}%`,
      sub: `${stats.aiResolved} handled by AI`,
      icon: Bot,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Human Handoffs',
      value: stats.humanHandoffs,
      icon: Handshake,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Angry Customer Alerts',
      value: stats.angryAlerts,
      icon: AlertOctagon,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Open Support Tickets',
      value: stats.openTickets,
      icon: Ticket,
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Trained Knowledge Sources',
      value: stats.trainedSources,
      icon: BookOpenCheck,
      accent: 'bg-sky-50 text-sky-600',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(({ label, value, sub, icon: Icon, accent }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              😡 Priority Sentiment Alerts (Angry Customers)
            </h2>
            <p className="text-xs text-slate-500">
              Conversations flagged with negative sentiment for immediate human attention.
            </p>
          </div>
          <Link to="/inbox" className="text-xs font-semibold text-indigo-600 hover:underline">
            Open Live Inbox →
          </Link>
        </div>

        {angryChats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No angry customer alerts right now. Everything looks calm! 😊
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {angryChats.map((chat) => (
              <Link
                key={chat.id}
                to={`/inbox?chatId=${chat.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-rose-50/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {chat.visitor_name || `Visitor #${chat.id}`}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{chat.last_message}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 shrink-0">
                  😡 Angry · {chat.status === 'human_handoff' ? 'Handoff' : 'AI Active'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
