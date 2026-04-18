import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios.config';
import baseeraLogo from '../assets/logo.png';
import './BaseeraFloatingChat.css';

const WIDGET_STORAGE_KEY = 'baseera_widget_conversations';
const WIDGET_CONV_ID = 'widget_conv';

const QUICK_PROMPTS = [
  'Show critical vulnerabilities',
  'How to fix SQL Injection?',
  'What is XSS?',
  'List all vulnerabilities',
];

const generateId = () => Math.random().toString(36).slice(2, 10);

const formatTime = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const loadMessages = () => {
  try {
    return JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveMessages = (msgs) => {
  localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(msgs));
};

const buildBotMessage = (payload) => {
  if (!payload) return 'No response received.';
  const { vulnerability, explanation, severity, fix } = payload;
  let msg = '';
  if (vulnerability) msg += `**${vulnerability}** (Severity: ${severity})\n\n`;
  if (explanation) msg += explanation + '\n\n';
  if (fix) msg += `**Fix:** ${fix}`;
  return msg.trim() || 'No analysis available.';
};

const renderContent = (content) => {
  return content.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
      </p>
    );
  });
};

export default function BaseeraFloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const updateMessages = (msgs) => {
    setMessages(msgs);
    saveMessages(msgs);
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages?')) {
      updateMessages([]);
    }
  };

  const sendMessage = async (text) => {
    if (isTyping) return;
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMsgs = [...messages, userMsg];
    updateMessages(updatedMsgs);
    setIsTyping(true);

    try {
      const data = await apiClient.post('/chat', {
        message: trimmed,
        conversationId: WIDGET_CONV_ID,
      });

      const payload = data?.data || data;
      const botMsg = {
        id: generateId(),
        role: 'bot',
        content: buildBotMessage(payload),
        timestamp: new Date().toISOString(),
      };
      updateMessages([...updatedMsgs, botMsg]);
    } catch {
      const errorMsg = {
        id: generateId(),
        role: 'bot',
        content: 'Sorry, I could not reach the AI service right now. Please try again later.',
        timestamp: new Date().toISOString(),
      };
      updateMessages([...updatedMsgs, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping) sendMessage();
    }
  };

  return (
    <>
      {/* Floating action button */}
      <button
        className="baseera-widget-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open Baseera chat'}
        title="Baseera AI Assistant"
      >
        <img src={baseeraLogo} alt="Baseera" className="baseera-widget-fab-logo" />
        <span className="baseera-widget-status-dot" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="baseera-widget-panel" role="dialog" aria-label="Baseera chat widget">
          {/* Header */}
          <div className="baseera-widget-header">
            <img src={baseeraLogo} alt="Baseera" className="baseera-widget-header-logo" />
            <div className="baseera-widget-header-info">
              <span className="baseera-widget-header-name">Baseera</span>
              <div className="baseera-widget-header-status">
                <span className="baseera-widget-header-dot" />
                <span className="baseera-widget-header-online">Online</span>
              </div>
            </div>
            <button
              className="baseera-widget-clear-btn"
              onClick={clearChat}
              aria-label="Clear chat"
              title="Clear chat"
            >
              <i className="fa-solid fa-trash" />
            </button>
            <button
              className="baseera-widget-minimize-btn"
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
            >
              &#8722;
            </button>
          </div>

          {/* Messages */}
          <div className="baseera-widget-messages">
            {messages.length === 0 && !isTyping && (
              <div className="baseera-widget-empty">
                <img src={baseeraLogo} alt="Baseera" className="baseera-widget-empty-logo" />
                <span>Ask Baseera about web vulnerabilities, fixes, and security best practices.</span>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`baseera-widget-msg ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="baseera-widget-avatar">
                    <img src={baseeraLogo} alt="Baseera" />
                  </div>
                )}
                <div>
                  <div className="baseera-widget-bubble">
                    {renderContent(msg.content)}
                  </div>
                  <span className="baseera-widget-time">{formatTime(msg.timestamp)}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="baseera-widget-avatar user-avatar">
                    <i className="fa-solid fa-user" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="baseera-widget-msg bot">
                <div className="baseera-widget-avatar">
                  <img src={baseeraLogo} alt="Baseera" />
                </div>
                <div className="baseera-widget-bubble baseera-widget-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-action chips */}
          {messages.length === 0 && (
            <div className="baseera-widget-chips">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="baseera-widget-chip"
                  onClick={() => sendMessage(p)}
                  disabled={isTyping}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="baseera-widget-input-area">
            <textarea
              ref={inputRef}
              className="baseera-widget-input"
              placeholder="Type here..."
              value={input}
              rows={1}
              disabled={isTyping}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              className="baseera-widget-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
