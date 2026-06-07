import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import apiClient from '../api/axios.config';
import baseeraLogo from '../assets/logo.png';
import './AIChatbot.css';

const MAX_INPUT_HEIGHT = 120;

const SUGGESTED_PROMPTS = [
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

const relativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d ago`;
  if (h >= 1) return `${h}h ago`;
  return 'Just now';
};

const loadConversations = () => {
  try {
    return JSON.parse(localStorage.getItem('baseera_conversations') || '[]');
  } catch {
    return [];
  }
};

const saveConversations = (convs) => {
  localStorage.setItem('baseera_conversations', JSON.stringify(convs));
};

const buildTitle = (msg) => {
  const text = msg.slice(0, 40);
  return text.length < msg.length ? text + '…' : text;
};

export default function AIChatbot() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConv ? activeConv.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close the export-format menu when the user clicks anywhere outside it.
  useEffect(() => {
    if (!showExportMenu) return;
    const onClick = (e) => {
      if (!e.target.closest?.('.chat-export-wrapper')) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showExportMenu]);

  const updateConversations = (updated) => {
    setConversations(updated);
    saveConversations(updated);
  };

  const newConversation = () => {
    const conv = {
      id: generateId(),
      title: 'New Conversation',
      preview: '',
      timestamp: new Date().toISOString(),
      messages: [],
    };
    const updated = [conv, ...conversations];
    updateConversations(updated);
    setActiveId(conv.id);
  };

  const clearConversations = () => {
    if (window.confirm('Clear all conversations?')) {
      updateConversations([]);
      setActiveId(null);
    }
  };

  // Clears only the messages inside the currently-open conversation.
  // Different from clearConversations (which wipes the whole sidebar) and
  // from deleteConversation (which removes the row entirely).
  const clearActiveConversation = () => {
    if (!activeId) return;
    if (!window.confirm('Clear all messages in this conversation?')) return;
    const updated = conversations.map((c) =>
      c.id === activeId
        ? { ...c, messages: [], preview: '', timestamp: new Date().toISOString() }
        : c
    );
    updateConversations(updated);
  };

  const deleteConversation = (convId, e) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== convId);
    updateConversations(updated);
    if (activeId === convId) setActiveId(null);
  };

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (convId) => {
    if (!editTitle.trim()) return;
    const updated = conversations.map((c) =>
      c.id === convId ? { ...c, title: editTitle.trim() } : c
    );
    updateConversations(updated);
    setEditingId(null);
  };

  // Shared chat export template — same look for HTML download and PDF print.
  // Mirrors the website: navy bg #0a1929, teal->cyan gradient header,
  // Inter font, glass cards. forPrint adds @media print invert so it looks
  // good on paper too.
  const buildChatHtml = async ({ forPrint }) => {
    // Convert logo PNG to base64 once so the exported HTML is fully
    // self-contained and renders the logo offline (and in the print preview).
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
    } catch { /* fall back to text 'B' */ }

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

    const msgHtml = messages.map((msg) => {
      const isUser = msg.role === 'user';
      const role = isUser ? 'You' : 'Baseera Assistant';
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
<title>${esc(activeConv.title)} — Baseera Chat</title>
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

  /* Hero */
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
  .hero-title {
    color: #f1f5f9;
    font-size: 24px;
    font-weight: 700;
    margin: 6px 0 6px;
    line-height: 1.25;
    word-break: break-word;
  }
  .hero-sub { color: #94a3b8; font-size: 13px; margin: 0; }

  /* Messages */
  .messages { display: flex; flex-direction: column; gap: 14px; }
  .msg-row { display: flex; }
  .msg-row.msg-user { justify-content: flex-end; }
  .msg-row.msg-bot  { justify-content: flex-start; }
  .msg-bubble {
    max-width: 78%;
    padding: 14px 18px;
    border-radius: 16px;
  }
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
  .msg-meta {
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; font-weight: 600;
  }
  .msg-user .msg-meta { color: #5eead4; }
  .msg-bot  .msg-meta { color: #94a3b8; }
  .msg-time { font-weight: 500; opacity: 0.7; }
  .msg-body { font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-wrap: break-word; }
  .msg-body strong { color: #00d9a5; font-weight: 700; }

  /* Footer */
  .export-footer {
    text-align: center; margin-top: 48px; padding-top: 22px;
    border-top: 1px solid #1e3a5f;
    color: #64748b; font-size: 11.5px;
  }
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
      <h1 class="hero-title">${esc(activeConv.title)}</h1>
      <p class="hero-sub">Exported ${esc(fmtFull)} · ${messages.length} message${messages.length === 1 ? '' : 's'}</p>
    </div>

    <div class="messages">
      ${msgHtml}
    </div>

    <div class="export-footer">
      Baseera · <span class="accent">Cybersecurity AI Assistant</span> · Conversation archive
    </div>
  </div>
</body>
</html>`;
  };

  const exportChatAsHTML = async () => {
    if (!activeConv || messages.length === 0) return;
    const html = await buildChatHtml({ forPrint: false });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title.replace(/[^a-z0-9]/gi, '_')}_chat.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Opens the chat in a new window and triggers the browser print dialog so
  // the user can save as PDF. We use the print path (no jsPDF dep) because it
  // keeps the bundle small and gives users control over paper size.
  const exportChatAsPDF = async () => {
    if (!activeConv || messages.length === 0) return;
    const html = await buildChatHtml({ forPrint: true });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 350);
    }
  };

  const sendMessage = async (text) => {
    if (isTyping) return; // Don't allow sending while bot is responding
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Rewrite API message if user is confirming a "Did you mean?" suggestion
    const affirmativePattern = /^(yes|yep|yeah|yea|sure|ok|okay|right|correct|absolutely|definitely|of course|go ahead|tell me|yes please)[!.,?]?\s*$/i;
    let apiMessage = trimmed;
    if (affirmativePattern.test(trimmed)) {
      const lastBotMsg = [...messages].reverse().find((m) => m.role === 'bot');
      const suggestedVuln = lastBotMsg?.rawData?.suggested_vuln
        || lastBotMsg?.rawData?.suggestedVuln
        || (typeof lastBotMsg?.rawData?.matched_by === 'string' && lastBotMsg.rawData.matched_by.startsWith('suggestion:')
            ? lastBotMsg.rawData.matched_by.replace('suggestion:', '')
            : null);
      if (suggestedVuln) {
        apiMessage = `What is ${suggestedVuln}?`;
      }
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    let convId = activeId;
    let updatedConvs = [...conversations];

    if (!convId) {
      const conv = {
        id: generateId(),
        title: buildTitle(trimmed),
        preview: trimmed,
        timestamp: new Date().toISOString(),
        messages: [userMsg],
      };
      updatedConvs = [conv, ...conversations];
      convId = conv.id;
    } else {
      updatedConvs = updatedConvs.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              preview: trimmed,
              timestamp: new Date().toISOString(),
              title: c.messages.length === 0 ? buildTitle(trimmed) : c.title,
            }
          : c
      );
    }

    setActiveId(convId);
    updateConversations(updatedConvs);
    setIsTyping(true);

    try {
      const data = await apiClient.post('/chat', {
        message: apiMessage,
        conversationId: convId,
      });

      const payload = data?.data || data;
      const botContent = buildBotMessage(payload);

      const botMsg = {
        id: generateId(),
        role: 'bot',
        content: botContent,
        rawData: payload,
        timestamp: new Date().toISOString(),
      };

      const withBot = updatedConvs.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, botMsg] } : c
      );
      updateConversations(withBot);
    } catch {
      const errorMsg = {
        id: generateId(),
        role: 'bot',
        content: 'Sorry, I could not reach the AI service right now. Please try again later.',
        timestamp: new Date().toISOString(),
      };
      const withError = updatedConvs.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, errorMsg] } : c
      );
      updateConversations(withError);
    } finally {
      setIsTyping(false);
    }
  };

  const buildBotMessage = (payload) => {
    if (!payload) return 'No response received.';
    const { vulnerability, explanation, severity, fix } = payload;
    let msg = '';
    if (vulnerability) {
      msg += `**${vulnerability}** (Severity: ${severity})\n\n`;
    }
    if (explanation) msg += explanation + '\n\n';
    if (fix) msg += `**Fix:** ${fix}`;
    return msg.trim() || 'No analysis available.';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping) sendMessage();
    }
  };

  const filteredConvs = searchQuery
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.messages.some((m) =>
            m.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : conversations;

  const renderMessage = (msg) => {
    return msg.content.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="chat-line">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="ai-chatbot-wrapper">
      <LandingNavbar />
      <div className="ai-chatbot-layout">
        {/* ── Sidebar ── */}
        <aside className="chatbot-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">
              <span className="bot-name">Baseera Assistant</span>
              <span className="online-dot" />
              <span className="online-label">Online</span>
            </div>
            <div className="sidebar-actions">
              <button className="sidebar-btn" onClick={newConversation}>
                New
              </button>
              <button className="sidebar-btn danger" onClick={clearConversations}>
                Clear
              </button>
            </div>
          </div>

          <div className="recent-conversations">
            <h4 className="section-label">Recent Conversations</h4>
            {filteredConvs.length === 0 ? (
              <p className="empty-hint">No conversations yet.</p>
            ) : (
              filteredConvs.map((c) => (
                <div
                  key={c.id}
                  className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                  onClick={() => setActiveId(c.id)}
                >
                  <div className="conv-item-header">
                    {editingId === c.id ? (
                      <input
                        className="conv-rename-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveRename(c.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename(c.id); } if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="conv-title">{c.title}</div>
                    )}
                    <div className="conv-item-actions">
                      <button className="conv-action-btn" onClick={(e) => startRename(c, e)} title="Rename">
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button className="conv-delete-btn" onClick={(e) => deleteConversation(c.id, e)} title="Delete">
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  </div>
                  <div className="conv-meta">
                    <span className="conv-preview">{c.preview}</span>
                    <span className="conv-time">{relativeTime(c.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="suggested-prompts">
            <h4 className="section-label">Suggested Prompts</h4>
            <div className="prompt-chips">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="prompt-chip"
                  onClick={() => sendMessage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Chat Area ── */}
        <main className="chatbot-main">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-conv-title">
                {activeConv ? activeConv.title : 'Baseera Assistant'}
              </span>
              {activeConv && (
                <span className="chat-synced">
                  Last synced {relativeTime(activeConv.timestamp)}
                </span>
              )}
            </div>
            <div className="chat-header-right">
              <div className="chat-export-wrapper" style={{ position: 'relative' }}>
                <i
                  className="fa-solid fa-download chat-icon-btn"
                  title="Export this conversation"
                  onClick={() => messages.length && setShowExportMenu(v => !v)}
                  style={{ cursor: messages.length ? 'pointer' : 'not-allowed', opacity: messages.length ? 1 : 0.4 }}
                />
                {showExportMenu && (
                  <div className="chat-export-menu">
                    <button
                      className="chat-export-item"
                      onClick={() => { setShowExportMenu(false); exportChatAsHTML(); }}
                    >
                      <i className="fa-solid fa-file-code" /> Export as HTML
                    </button>
                    <button
                      className="chat-export-item"
                      onClick={() => { setShowExportMenu(false); exportChatAsPDF(); }}
                    >
                      <i className="fa-solid fa-file-pdf" /> Export as PDF
                    </button>
                  </div>
                )}
              </div>
              <i
                className="fa-solid fa-trash chat-icon-btn chat-icon-danger"
                title="Clear this conversation"
                onClick={clearActiveConversation}
                style={{ cursor: messages.length ? 'pointer' : 'not-allowed', opacity: messages.length ? 1 : 0.4 }}
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="chat-search-bar">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && !isTyping && (
              <div className="chat-empty">
                <div className="chat-empty-badge">
                  <img src={baseeraLogo} alt="Baseera" />
                </div>
                <p>Ask Baseera about web vulnerabilities, fixes, and security best practices.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    <i className="fa-solid fa-user" />
                  ) : (
                    <img src={baseeraLogo} alt="Baseera" className="bot-icon-img" />
                  )}
                </div>
                <div className="message-body">
                  <div className="message-bubble">{renderMessage(msg)}</div>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message bot">
                <div className="message-avatar">
                  <img src={baseeraLogo} alt="Baseera" className="bot-icon-img" />
                </div>
                <div className="message-body">
                  <div className="message-bubble typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Ask Baseera..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, MAX_INPUT_HEIGHT) + 'px';
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                cols={40}
                wrap="soft"
                disabled={isTyping}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
              >
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
            <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </main>
      </div>
    </div>
  );
}
