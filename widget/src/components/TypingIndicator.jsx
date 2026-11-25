export default function TypingIndicator({ sender = 'ai' }) {
  return (
    <div class="aiw-msg-row bot">
      <span class="aiw-sender-tag">
        {sender === 'agent' ? 'Human Agent is typing...' : 'AI is typing...'}
      </span>
      <div class="aiw-typing">
        <span class="aiw-dot" />
        <span class="aiw-dot" />
        <span class="aiw-dot" />
      </div>
    </div>
  );
}
