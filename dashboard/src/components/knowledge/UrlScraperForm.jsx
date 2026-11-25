import { useState } from 'react';
import { Globe, Loader2, PlusCircle } from 'lucide-react';

export default function UrlScraperForm({ onScrapeUrl, onAddFaq }) {
  const [url, setUrl] = useState('');
  const [faqTitle, setFaqTitle] = useState('');
  const [faqContent, setFaqContent] = useState('');
  const [scraping, setScraping] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);
  const [error, setError] = useState('');

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setScraping(true);
    try {
      await onScrapeUrl(url.trim());
      setUrl('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to scrape website URL');
    } finally {
      setScraping(false);
    }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    if (!faqTitle.trim() || !faqContent.trim()) return;
    setError('');
    setSavingFaq(true);
    try {
      await onAddFaq(faqTitle.trim(), faqContent.trim());
      setFaqTitle('');
      setFaqContent('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save FAQ');
    } finally {
      setSavingFaq(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleScrape} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Website URL Scraper</h2>
            <p className="text-xs text-slate-500">
              Give a webpage link and the AI will read, clean, and train on it.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/pricing"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={scraping}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0"
          >
            {scraping && <Loader2 className="w-4 h-4 animate-spin" />}
            {scraping ? 'Training...' : 'Scrape & Train'}
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-rose-600 font-medium">{error}</p>}
      </form>

      <form onSubmit={handleFaqSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add Custom FAQ / Policy</h2>
            <p className="text-xs text-slate-500">
              Add refund rules, opening hours, or internal docs directly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            required
            value={faqTitle}
            onChange={(e) => setFaqTitle(e.target.value)}
            placeholder="e.g., Refund & Return Policy"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            rows={3}
            required
            value={faqContent}
            onChange={(e) => setFaqContent(e.target.value)}
            placeholder="Paste FAQ answer or product guide here..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={savingFaq}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold"
          >
            {savingFaq ? 'Saving...' : 'Save to Knowledge Base'}
          </button>
        </div>
      </form>
    </div>
  );
}
