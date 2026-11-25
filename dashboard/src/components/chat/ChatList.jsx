const SENTIMENT_BADGE = {
  angry: { label: '😡 Angry', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  happy: { label: '😊 Happy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  neutral: { label: '😐 Neutral', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const STATUS_BADGE = {
  ai_active: { label: 'AI Active', cls: 'bg-indigo-50 text-indigo-700' },
  human_handoff: { label: 'Human Handoff', cls: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700' },
};

export default function ChatList({ chats, selectedId, onSelect }) {
  if (!chats.length) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        No conversations match this filter yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
      {chats.map((chat) => {
        const sentiment = SENTIMENT_BADGE[chat.sentiment] || SENTIMENT_BADGE.neutral;
        const status = STATUS_BADGE[chat.status] || STATUS_BADGE.ai_active;
        const isSelected = chat.id === selectedId;

        return (
          <button
            key={chat.id}
            onClick={() => onSelect(chat)}
            className={`w-full text-left p-4 transition-colors hover:bg-slate-50 ${
              isSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {chat.visitor_name || `Visitor #${chat.id}`}
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sentiment.cls}`}>
                {sentiment.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 truncate mb-2">
              {chat.last_message || 'Started a conversation'}
            </p>

            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${status.cls}`}>
                {status.label}
              </span>
              <span className="text-[11px] text-slate-400">
                {chat.last_message_at
                  ? new Date(chat.last_message_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
