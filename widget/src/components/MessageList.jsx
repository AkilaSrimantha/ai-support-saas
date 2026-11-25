import { useEffect, useRef } from 'preact/hooks';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, primaryColor, typingState }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingState?.isTyping]);

  return (
    <div class="aiw-messages">
      {messages.map((msg) => {
        if (msg.sender_type === 'system') {
          return (
            <div key={msg.id} class="aiw-msg-row system">
              <div class="aiw-bubble system">{msg.content}</div>
            </div>
          );
        }

        const isVisitor = msg.sender_type === 'visitor';
        const isAgent = msg.sender_type === 'agent';

        return (
          <div key={msg.id} class={`aiw-msg-row ${isVisitor ? 'visitor' : isAgent ? 'agent' : 'bot'}`}>
            {!isVisitor && (
              <span class="aiw-sender-tag">{isAgent ? 'Human Agent' : 'AI Support'}</span>
            )}
            <div
              class={`aiw-bubble ${isVisitor ? 'visitor' : isAgent ? 'agent' : 'ai'}`}
              style={isVisitor ? { backgroundColor: primaryColor || '#4f46e5' } : undefined}
            >
              {msg.content}
            </div>
          </div>
        );
      })}

      {typingState?.isTyping && <TypingIndicator sender={typingState.sender} />}
      <div ref={bottomRef} />
    </div>
  );
}
