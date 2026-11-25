import { useState } from 'react';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Navbar({ title }) {
  const { user, toggleOnline } = useAuth();
  const { socket, connected, notifications, markAllRead } = useSocket();
  const [openAlerts, setOpenAlerts] = useState(false);
  const navigate = useNavigate();

  const isOnline = Boolean(user?.is_online);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleOnline = async () => {
    const next = !isOnline;
    await toggleOnline(next);
    socket?.emit('agent:set_online', { isOnline: next });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? 'Live Socket' : 'Connecting...'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleToggleOnline}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
          />
          {isOnline ? 'Agent Online' : 'Agent Offline'}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setOpenAlerts((v) => !v);
              if (!openAlerts && unreadCount > 0) markAllRead();
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {openAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Real-Time Alerts</span>
                <button
                  onClick={() => setOpenAlerts(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 text-center">No alerts yet.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setOpenAlerts(false);
                        navigate(`/inbox?chatId=${n.chatId}`);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
