import { AlertTriangle, Globe, Mail, User } from 'lucide-react';

const SENTIMENT_META = {
  angry: { emoji: '😡', label: 'Angry / Frustrated', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  happy: { emoji: '😊', label: 'Happy / Satisfied', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  neutral: { emoji: '😐', label: 'Neutral', color: 'text-slate-700 bg-slate-50 border-slate-200' },
};

export default function CustomerInfo({ chat }) {
  if (!chat) return null;

  const meta = SENTIMENT_META[chat.sentiment] || SENTIMENT_META.neutral;

  return (
    <aside className="w-72 border-l border-slate-200 bg-white p-5 space-y-6 shrink-0 hidden xl:block overflow-y-auto">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Visitor Profile
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2.5 text-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium truncate">{chat.visitor_name || 'Website Visitor'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate text-xs">{chat.visitor_email || 'No email provided'}</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-600">
            <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-xs break-all">{chat.page_url || 'Unknown page URL'}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          AI Sentiment Summary
        </h3>
        <div className={`p-3 rounded-xl border ${meta.color}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="text-lg">{meta.emoji}</span>
            <span>{meta.label}</span>
          </div>
          <p className="text-xs mt-1 opacity-80">
            Score: {Number(chat.sentiment_score || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {chat.handoff_reason && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Escalation Reason
          </h3>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{chat.handoff_reason}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
