import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  Ticket,
  BookOpen,
  Code2,
  Bot,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/inbox', label: 'Live Inbox', icon: MessageSquareText },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/integration', label: 'Widget & Embed', icon: Code2 },
];

export default function Sidebar() {
  const { bot, user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate text-white">{bot?.name || 'SupportAI'}</p>
          <p className="text-xs text-slate-400 truncate">SaaS Admin Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
