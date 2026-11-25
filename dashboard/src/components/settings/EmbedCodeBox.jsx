import { useState } from 'react';
import { Check, Copy, ExternalLink, KeyRound } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

export default function EmbedCodeBox({ bot, onRegenerateKey }) {
  const [copied, setCopied] = useState(false);

  const botKey = bot?.bot_key || 'pk_live_your_key';
  const snippet = `<script>window.AISupportConfig = { botKey: "${botKey}", serverUrl: "${API_BASE_URL}" };</script>\n<script src="${API_BASE_URL}/widget.js" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">2-Line Website Embed Code</h2>
          <p className="text-xs text-slate-500">
            Paste these 2 lines before the closing <code>&lt;/body&gt;</code> tag of any website.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${API_BASE_URL}/demo?botKey=${encodeURIComponent(botKey)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Test Live Demo Page
          </a>

          <button
            onClick={onRegenerateKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Rotate Key
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="bg-slate-900 text-indigo-200 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
          {snippet}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
