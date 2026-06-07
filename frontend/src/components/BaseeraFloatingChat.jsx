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
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  // Close the export-format menu when the user clicks outside it.
  useEffect(() => {
    if (!showExportMenu) return;
    const onClick = (e) => {
      if (!e.target.closest?.('.baseera-widget-export-wrapper')) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showExportMenu]);

  const updateMessages = (msgs) => {
    setMessages(msgs);
    saveMessages(msgs);
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages?')) {
      updateMessages([]);
    }
  };

  // Shared branded chat export template — same shape as the AIChatbot page.
  // Navy bg + teal->cyan hero + Inter font + glass message bubbles. forPrint
  // adds @media print rules for paper-friendly output.
  const buildExportHtml = async ({ forPrint }) => {
    let logoDataUri = null;
    try {
      const resp = await fetch(baseeraLogo);
      const blob = await resp.blob();
      logoDataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { /* fall back to 'B' below */ }

    const logoMark = logoDataUri
      ? `<img src="${logoDataUri}" alt="Baseera" />`
      : '<span class="logo-fallback">B</span>';
    const faviconHtml = logoDataUri ? `<link rel="icon" href="${logoDataUri}" />` : '';

    const esc = (s) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fmtFull = new Date().toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const title = `Baseera Quick Chat — ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;

    const msgHtml = messages.map((msg) => {
      const isUser = msg.role === 'user';
      const role = isUser ? 'You' : 'Baseera';
      const time = fmtTime(msg.timestamp);
      const body = esc(msg.content)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      return `
      <div class="msg-row ${isUser ? 'msg-user' : 'msg-bot'}">
        <div class="msg-bubble">
          <div class="msg-meta">
            <span class="msg-role">${role}</span>
            <span class="msg-time">${esc(time)}</span>
          </div>
          <div class="msg-body">${body}</div>
        </div>
      </div>`;
    }).join('');

    const printStyles = forPrint ? `
      @page { margin: 16mm 12mm; }
      @media print {
        body { background: #ffffff !important; }
        .export-shell { background: #ffffff !important; }
        .hero, .msg-bubble { background: #ffffff !important; border-color: #d6dde6 !important; box-shadow: none !important; }
        .hero-title, .hero-subtitle, .msg-role, .msg-body { color: #0a1929 !important; }
        .msg-time, .hero-sub { color: #475569 !important; }
        .msg-user .msg-bubble { background: #ecfdf5 !important; border-color: #a7f3d0 !important; }
        .msg-row { page-break-inside: avoid; }
      }` : '';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
${faviconHtml}
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a1929;
    color: #e2e8f0;
    line-height: 1.6;
  }
  .export-shell { max-width: 820px; margin: 0 auto; padding: 48px 24px 80px; }
  .hero {
    background: linear-gradient(135deg, #0d2137 0%, #132f4c 60%, #0d2137 100%);
    border: 1px solid #1e3a5f;
    border-radius: 18px;
    padding: 30px 32px;
    position: relative;
    overflow: hidden;
    margin-bottom: 32px;
  }
  .hero::before {
    content: ""; position: absolute; top: -60px; right: -60px;
    width: 240px; height: 240px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,217,165,0.20), transparent 65%);
    pointer-events: none;
  }
  .hero-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .hero-logo {
    width: 42px; height: 42px; border-radius: 12px;
    background: linear-gradient(135deg, #00d9a5 0%, #00b4d8 100%);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .hero-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
  .logo-fallback { color: #fff; font-weight: 800; font-size: 18px; }
  .hero-brand-name { color: #ffffff; font-weight: 700; font-size: 17px; letter-spacing: 0.2px; }
  .hero-title { color: #f1f5f9; font-size: 24px; font-weight: 700; margin: 6px 0 6px; line-height: 1.25; word-break: break-word; }
  .hero-sub { color: #94a3b8; font-size: 13px; margin: 0; }
  .messages { display: flex; flex-direction: column; gap: 14px; }
  .msg-row { display: flex; }
  .msg-row.msg-user { justify-content: flex-end; }
  .msg-row.msg-bot { justify-content: flex-start; }
  .msg-bubble { max-width: 78%; padding: 14px 18px; border-radius: 16px; }
  .msg-user .msg-bubble {
    background: linear-gradient(135deg, rgba(0,188,125,0.20) 0%, rgba(0,184,219,0.20) 100%);
    border: 1px solid rgba(0,217,165,0.35);
    border-bottom-right-radius: 6px;
    color: #f1f5f9;
  }
  .msg-bot .msg-bubble {
    background: #0d2137;
    border: 1px solid #1e3a5f;
    border-bottom-left-radius: 6px;
    color: #e2e8f0;
  }
  .msg-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; font-weight: 600; }
  .msg-user .msg-meta { color: #5eead4; }
  .msg-bot .msg-meta { color: #94a3b8; }
  .msg-time { font-weight: 500; opacity: 0.7; }
  .msg-body { font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-wrap: break-word; }
  .msg-body strong { color: #00d9a5; font-weight: 700; }
  .export-footer { text-align: center; margin-top: 48px; padding-top: 22px; border-top: 1px solid #1e3a5f; color: #64748b; font-size: 11.5px; }
  .export-footer .accent { color: #00d9a5; }
  ${printStyles}
</style>
</head>
<body>
  <div class="export-shell">
    <div class="hero">
      <div class="hero-brand">
        <div class="hero-logo">${logoMark}</div>
        <span class="hero-brand-name">Baseera Assistant</span>
      </div>
      <h1 class="hero-title">${esc(title)}</h1>
      <p class="hero-sub">Exported ${esc(fmtFull)} · ${messages.length} message${messages.length === 1 ? '' : 's'}</p>
    </div>
    <div class="messages">${msgHtml}</div>
    <div class="export-footer">Baseera · <span class="accent">Cybersecurity AI Assistant</span> · Quick chat archive</div>
  </div>
</body>
</html>`;
  };

  const exportChatAsHTML = async () => {
    if (messages.length === 0) return;
    const html = await buildExportHtml({ forPrint: false });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseera-quick-chat-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChatAsPDF = async () => {
    if (messages.length === 0) return;
    const html = await buildExportHtml({ forPrint: true });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 350);
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
            <div className="baseera-widget-export-wrapper">
              <button
                className="baseera-widget-clear-btn"
                onClick={() => messages.length && setShowExportMenu(v => !v)}
                aria-label="Export chat"
                title="Export chat"
                disabled={messages.length === 0}
                style={{ opacity: messages.length === 0 ? 0.35 : 1 }}
              >
                <i className="fa-solid fa-download" />
              </button>
              {showExportMenu && (
                <div className="baseera-widget-export-menu">
                  <button
                    className="baseera-widget-export-item"
                    onClick={() => { setShowExportMenu(false); exportChatAsHTML(); }}
                  >
                    <i className="fa-solid fa-file-code" /> Export as HTML
                  </button>
                  <button
                    className="baseera-widget-export-item"
                    onClick={() => { setShowExportMenu(false); exportChatAsPDF(); }}
                  >
                    <i className="fa-solid fa-file-pdf" /> Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button
              className="baseera-widget-clear-btn"
              onClick={clearChat}
              aria-label="Clear chat"
              title="Clear chat"
              disabled={messages.length === 0}
              style={{ opacity: messages.length === 0 ? 0.35 : 1 }}
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
                <div className="baseera-widget-empty-badge">
                  <img src={baseeraLogo} alt="Baseera" />
                </div>
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
