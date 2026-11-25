import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Overview from './pages/Overview';
import LiveInbox from './pages/LiveInbox';
import Tickets from './pages/Tickets';
import KnowledgeBase from './pages/KnowledgeBase';
import Integration from './pages/Integration';

const PAGE_TITLES = {
  '/': 'Analytics Overview',
  '/inbox': 'Live Chat Inbox & Human Handoff',
  '/tickets': 'Support Tickets',
  '/knowledge': 'AI Knowledge Base & URL Scraper',
  '/integration': 'Widget Customizer & 2-Line Embed',
};

function ProtectedShell() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/inbox" element={<LiveInbox />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/integration" element={<Integration />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedShell />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
