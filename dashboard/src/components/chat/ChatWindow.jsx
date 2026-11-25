import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Handshake, Send, TicketPlus, UserRound } from 'lucide-react';

export default function ChatWindow({
  chat,
  messages,
  onSendMessage,
  onTakeOver,
  onReturnToAi,
  onResolve,
  onCreateTicket,
  onTyping,
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
        <Bot className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Select a conversation from the inbox</p>
        <p className="text-xs mt-1">Monitor live AI responses, sentiment alerts, or take over as a human agent.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(text.trim());
      setText('');
      onTyping?.(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header */}
      <div className="min-h-[4rem] px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">
            {chat.visitor_name || `Visitor #${chat.id}`}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Chat #{chat.id} · {chat.status === 'human_handoff' ? 'Human Agent Handling' : chat.status === 'resolved' ? 'Resolved' : 'AI Bot Handling'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {chat.status !== 'human_handoff' ? (
            <button
              onClick={onTakeOver}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
            >
              <Handshake className="w-3.5 h-3.5" />
              Take Over from AI
            </button>
          ) : (
            <button
              onClick={onReturnToAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              Return to AI
            </button>
          )}

          <button
            onClick={onCreateTicket}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            <TicketPlus className="w-3.5 h-3.5" />
            Ticket
          </button>

          {chat.status !== 'resolved' && (
            <button
              onClick={onResolve}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
        {messages.map((msg) => {
          if (msg.sender_type === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-xs">
                  {msg.content}
                </span>
              </div>
            );
          }

          const isVisitor = msg.sender_type === 'visitor';
          const isAgent = msg.sender_type === 'agent';

          return (
            <div key={msg.id} className={`flex ${isVisitor ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] ${isVisitor ? '' : 'items-end flex flex-col'}`}>
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                  {isVisitor ? (
                    <>
                      <UserRound className="w-3 h-3" />
                      <span>Visitor</span>
                    </>
                  ) : isAgent ? (
                    <span>Human Agent</span>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-indigo-600" />
                      <span className="text-indigo-600 font-medium">Gemini AI</span>
                    </>
                  )}
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                    isVisitor
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                      : isAgent
                        ? 'bg-emerald-600 text-white rounded-tr-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          placeholder="Reply as a human agent (automatically pauses AI)..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}
