import { useEffect, useState } from 'react';
import { MessageCircle, Save, Send } from 'lucide-react';

export default function WidgetCustomizer({ bot, onSave }) {
  const [form, setForm] = useState({
    name: '',
    primary_color: '#4f46e5',
    welcome_message: '',
    position: 'bottom-right',
    allowed_domains: '*',
    system_prompt: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (bot) {
      setForm({
        name: bot.name || '',
        primary_color: bot.primary_color || '#4f46e5',
        welcome_message: bot.welcome_message || '',
        position: bot.position || 'bottom-right',
        allowed_domains: bot.allowed_domains || '*',
        system_prompt: bot.system_prompt || '',
      });
    }
  }, [bot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await onSave(form);
      setSavedMsg('Widget settings saved!');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
      >
        <h2 className="text-base font-semibold text-slate-900">Customize Chat Widget</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bot Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Brand Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Welcome Message</label>
          <input
            type="text"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Widget Position</label>
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Allowed Domains (* for all)
            </label>
            <input
              type="text"
              value={form.allowed_domains}
              onChange={(e) => setForm({ ...form, allowed_domains: e.target.value })}
              placeholder="example.com, app.example.com"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            AI Persona / System Instructions (Optional)
          </label>
          <textarea
            rows={3}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="e.g., Always be friendly, answer in concise bullet points, and offer a discount code if shipping is delayed."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {savedMsg && <span className="text-xs font-medium text-emerald-600">{savedMsg}</span>}
        </div>
      </form>

      {/* Live Preview */}
      <div className="lg:col-span-5 bg-slate-100 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Live Widget Preview
        </p>

        <div
          className={`flex flex-col ${
            form.position === 'bottom-left' ? 'items-start' : 'items-end'
          }`}
        >
          <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-3">
            <div
              className="px-4 py-3 text-white flex items-center justify-between"
              style={{ backgroundColor: form.primary_color }}
            >
              <div>
                <p className="font-semibold text-sm">{form.name || 'Support AI'}</p>
                <p className="text-[11px] opacity-90">Replies instantly · Powered by Gemini</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>

            <div className="p-4 space-y-3 bg-slate-50 h-44">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 max-w-[85%] shadow-sm">
                {form.welcome_message || 'Hi! How can I help you today?'}
              </div>
              <div
                className="ml-auto rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs text-white max-w-[75%]"
                style={{ backgroundColor: form.primary_color }}
              >
                What are your pricing plans?
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
              <div className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-400">
                Type a message...
              </div>
              <div
                className="p-2 rounded-lg text-white"
                style={{ backgroundColor: form.primary_color }}
              >
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div
            className="w-12 h-12 rounded-full shadow-lg text-white flex items-center justify-center"
            style={{ backgroundColor: form.primary_color }}
          >
            <MessageCircle className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
