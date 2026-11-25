import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmbedCodeBox from '../components/settings/EmbedCodeBox';
import WidgetCustomizer from '../components/settings/WidgetCustomizer';

export default function Integration() {
  const { bot, setBot } = useAuth();

  const handleSave = async (payload) => {
    const res = await api.put('/bot', payload);
    setBot(res.data.bot);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerate your public botKey? Existing embeds using the old key will stop working.')) {
      return;
    }
    const res = await api.post('/bot/regenerate-key');
    setBot(res.data.bot);
  };

  return (
    <div className="p-6 space-y-6">
      <EmbedCodeBox bot={bot} onRegenerateKey={handleRegenerateKey} />
      <WidgetCustomizer bot={bot} onSave={handleSave} />
    </div>
  );
}
