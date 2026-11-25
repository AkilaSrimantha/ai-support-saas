import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import widgetCss from './styles/widget.css?inline';
import { createWidgetSocket } from './services/socketClient';
import LauncherButton from './components/LauncherButton';
import ChatBox from './components/ChatBox';

function getOrCreateVisitorId(botKey) {
  const storageKey = `aiw_visitor_${botKey}`;
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = `vis_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, id);
  }
  return id;
}

function WidgetApp({ config }) {
  const [isOpen, setIsOpen] = useState(false);
  const [botConfig, setBotConfig] = useState({
    name: 'Support AI',
    primaryColor: '#4f46e5',
    welcomeMessage: 'Hi! 👋 How can I help you today?',
    position: 'bottom-right',
  });
  const [chatStatus, setChatStatus] = useState('ai_active');
  const [messages, setMessages] = useState([]);
  const [typingState, setTypingState] = useState({ isTyping: false, sender: 'ai' });

  const socketRef = useRef(null);
  const visitorIdRef = useRef(getOrCreateVisitorId(config.botKey));

  useEffect(() => {
    // Load public appearance config first so launcher matches brand color immediately
    fetch(`${config.serverUrl}/api/bot/public/config?botKey=${encodeURIComponent(config.botKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setBotConfig((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    const socket = createWidgetSocket(config.serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(
        'widget:join',
        {
          botKey: config.botKey,
          visitorId: visitorIdRef.current,
          visitorName: config.visitorName || undefined,
          visitorEmail: config.visitorEmail || undefined,
          pageUrl: window.location.href,
        },
        (res) => {
          if (res && !res.error) {
            if (res.botConfig) setBotConfig((prev) => ({ ...prev, ...res.botConfig }));
            if (res.chat?.status) setChatStatus(res.chat.status);
            if (Array.isArray(res.messages)) setMessages(res.messages);
          }
        }
      );
    });

    socket.on('chat:message', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    socket.on('chat:typing', (state) => {
      setTypingState({ isTyping: Boolean(state?.isTyping), sender: state?.sender || 'ai' });
    });

    socket.on('chat:status_changed', (payload) => {
      if (payload?.status) setChatStatus(payload.status);
    });

    return () => {
      socket.disconnect();
    };
  }, [config.botKey, config.serverUrl]);

  const handleSendMessage = (content) => {
    socketRef.current?.emit('widget:message', {
      botKey: config.botKey,
      visitorId: visitorIdRef.current,
      content,
      visitorName: config.visitorName,
      visitorEmail: config.visitorEmail,
    });
  };

  const handleRequestHandoff = () => {
    socketRef.current?.emit('widget:request_handoff', {
      botKey: config.botKey,
      visitorId: visitorIdRef.current,
      reason: 'Visitor clicked Talk to Human button',
    });
  };

  const posClass = botConfig.position === 'bottom-left' ? 'aiw-pos-left' : 'aiw-pos-right';

  return h(
    'div',
    { class: `aiw-container ${posClass}` },
    isOpen &&
      h(ChatBox, {
        botConfig,
        chatStatus,
        messages,
        typingState,
        onSendMessage: handleSendMessage,
        onRequestHandoff: handleRequestHandoff,
        onClose: () => setIsOpen(false),
      }),
    h(LauncherButton, {
      isOpen,
      color: botConfig.primaryColor,
      onClick: () => setIsOpen((v) => !v),
    })
  );
}

(function mountAISupportWidget() {
  if (typeof window === 'undefined' || window.__AI_SUPPORT_WIDGET_MOUNTED__) return;

  const currentScript = document.currentScript;
  const globalConfig = window.AISupportConfig || {};
  const botKey = globalConfig.botKey || currentScript?.getAttribute('data-bot-key');

  if (!botKey) {
    console.warn('AISupportWidget: Missing botKey in window.AISupportConfig');
    return;
  }

  let serverUrl = globalConfig.serverUrl;
  if (!serverUrl && currentScript?.src) {
    try {
      serverUrl = new URL(currentScript.src).origin;
    } catch {
      serverUrl = 'http://localhost:5000';
    }
  }
  serverUrl = (serverUrl || 'http://localhost:5000').replace(/\/$/, '');

  window.__AI_SUPPORT_WIDGET_MOUNTED__ = true;

  const host = document.createElement('div');
  host.id = 'ai-support-saas-widget-host';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = widgetCss;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);

  render(
    h(WidgetApp, {
      config: {
        botKey,
        serverUrl,
        visitorName: globalConfig.visitorName,
        visitorEmail: globalConfig.visitorEmail,
      },
    }),
    mountPoint
  );
})();
