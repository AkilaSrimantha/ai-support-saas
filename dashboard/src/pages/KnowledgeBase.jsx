import { useEffect, useState } from 'react';
import api from '../services/api';
import UrlScraperForm from '../components/knowledge/UrlScraperForm';
import TrainedPagesList from '../components/knowledge/TrainedPagesList';

export default function KnowledgeBase() {
  const [sources, setSources] = useState([]);

  const loadSources = async () => {
    const res = await api.get('/knowledge');
    setSources(res.data.sources || []);
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleScrapeUrl = async (url) => {
    const res = await api.post('/knowledge/scrape', { url });
    setSources((prev) => [res.data.source, ...prev]);
  };

  const handleAddFaq = async (title, content) => {
    const res = await api.post('/knowledge/faq', { title, content });
    setSources((prev) => [res.data.source, ...prev]);
  };

  const handleRescrape = async (id) => {
    const res = await api.post(`/knowledge/${id}/rescrape`);
    setSources((prev) => [res.data.source, ...prev.filter((s) => s.id !== id)]);
  };

  const handleDelete = async (id) => {
    await api.delete(`/knowledge/${id}`);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <UrlScraperForm onScrapeUrl={handleScrapeUrl} onAddFaq={handleAddFaq} />
      <TrainedPagesList sources={sources} onRescrape={handleRescrape} onDelete={handleDelete} />
    </div>
  );
}
