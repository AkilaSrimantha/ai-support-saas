import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const PRIORITY_STYLE = {
  urgent: 'bg-rose-100 text-rose-700',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-indigo-50 text-indigo-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    visitor_name: '',
    visitor_email: '',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const { socket } = useSocket();

  const loadTickets = async () => {
    const res = await api.get('/tickets', { params: { status: statusFilter } });
    setTickets(res.data.tickets || []);
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;
    const onCreated = (ticket) => {
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
    };
    socket.on('ticket:created', onCreated);
    return () => socket.off('ticket:created', onCreated);
  }, [socket]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await api.post('/tickets', form);
    setTickets((prev) => [res.data.ticket, ...prev]);
    setForm({ visitor_name: '', visitor_email: '', subject: '', description: '', priority: 'medium' });
    setShowNew(false);
  };

  const handleStatusChange = async (id, nextStatus) => {
    const res = await api.patch(`/tickets/${id}`, { status: nextStatus });
    setTickets((prev) => prev.map((t) => (t.id === id ? res.data.ticket : t)));
  };

  const handleDelete = async (id) => {
    await api.delete(`/tickets/${id}`);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            placeholder="Customer Name"
            value={form.visitor_name}
            onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="email"
            placeholder="Customer Email"
            value={form.visitor_email}
            onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Ticket Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <textarea
            rows={3}
            required
            placeholder="Issue description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Create Ticket
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No support tickets found. Tickets are auto-created when AI escalates tough issues or manually from Live Inbox.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 max-w-md">
                    <p className="font-semibold text-slate-900">#{t.id} · {t.subject}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{t.description}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs font-medium text-slate-800">{t.visitor_name || 'Visitor'}</p>
                    <p className="text-xs text-slate-400">{t.visitor_email || '—'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                        PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
