import { FileText, Globe, RefreshCw, Trash2 } from 'lucide-react';

const STATUS_STYLE = {
  trained: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-rose-50 text-rose-700',
};

export default function TrainedPagesList({ sources, onRescrape, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Trained Knowledge Sources ({sources.length})
        </h3>
      </div>

      {sources.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          No URLs or FAQs trained yet. Add your website URL above to start training Gemini AI.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sources.map((src) => (
            <div key={src.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                  {src.source_type === 'url' ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{src.title}</p>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:underline truncate block"
                    >
                      {src.url}
                    </a>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        STATUS_STYLE[src.status] || STATUS_STYLE.pending
                      }`}
                    >
                      {src.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{src.chunk_count} text chunks</span>
                    {src.error_message && (
                      <span className="text-xs text-rose-600 truncate">{src.error_message}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {src.source_type === 'url' && (
                  <button
                    onClick={() => onRescrape(src.id)}
                    title="Re-scrape URL"
                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(src.id)}
                  title="Delete source"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
