import { useState } from 'preact/hooks';
import MessageList from './MessageList';

export default function ChatBox({
  botConfig,
  chatStatus,
  messages,
  typingState,
  onSendMessage,
  onRequestHandoff,
  onClose,
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
  };

  return (
    <div class="aiw-chatbox" role="dialog" aria-label="Customer Support Chat">
      <div class="aiw-header" style={{ backgroundColor: botConfig.primaryColor || '#4f46e5' }}>
        <div>
          <p class="aiw-header-title">{botConfig.name || 'Support AI'}</p>
          <p class="aiw-header-sub">
            {chatStatus === 'human_handoff'
              ? 'Connected with Human Agent'
              : '24/7 AI Assistant · Instant Reply'}
          </p>
        </div>

        <div class="aiw-header-actions">
          {chatStatus !== 'human_handoff' && (
            <button type="button" class="aiw-handoff-btn" onClick={onRequestHandoff}>
              Talk to Human
            </button>
          )}
          <button type="button" class="aiw-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>

      <MessageList
        messages={messages}
        primaryColor={botConfig.primaryColor}
        typingState={typingState}
      />

      <form class="aiw-footer" onSubmit={handleSubmit}>
        <input
          type="text"
          class="aiw-input"
          value={text}
          onInput={(e) => setText(e.target.value)}
          placeholder="Ask anything..."
        />
        <button
          type="submit"
          class="aiw-send-btn"
          style={{ backgroundColor: botConfig.primaryColor || '#4f46e5' }}
          disabled={!text.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
