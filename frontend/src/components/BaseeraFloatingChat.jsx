import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios.config';
import baseeraLogo from '../assets/logo.png';
import './BaseeraFloatingChat.css';

// Personalised welcome greeting used when the conversation is empty.
// Reads the stored username and only personalises when it looks like a
// real name (not 'user' / 'User' / empty). Returns plain greeting otherwise.
const buildGreeting = () => {
  const raw = (localStorage.getItem('baseeraUserName') || '').trim();
  const looksReal = raw && raw.toLowerCase() !== 'user' && raw.length >= 2;
  if (looksReal) {
    return `👋 Hey ${raw}, I'm Baseera AI, your security assistant. Ask me about any vulnerability and I'll explain what it is and how to fix it.`;
  }
  return `👋 Hey there! I'm Baseera AI, your security assistant. Ask me about any vulnerability and I'll explain what it is and how to fix it.`;
};

const WIDGET_STORAGE_KEY = 'baseera_widget_conversations';
const WIDGET_OPEN_KEY = 'baseera_widget_open';

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

// First-user-message becomes the thread title (truncated). Same idea as the
// AIChatbot page so the UX feels consistent.
const buildTitle = (msg) => {
  const text = String(msg || '').slice(0, 32);
  return text.length < (msg?.length || 0) ? text + '…' : (text || 'New chat');
};

// Multi-thread storage. Each entry is { id, title, timestamp, messages: [...] }.
// Migration: the original shape stored a flat array of messages under the same
// key, so wrap legacy data into a single conversation on first load. This way
// users don't lose their old chats when the new feature ships.
const loadConversations = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) || '[]');
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const looksLikeOldMessages =
      raw[0] && typeof raw[0] === 'object' && 'role' in raw[0] && 'content' in raw[0];
    if (looksLikeOldMessages) {
      return [{
        id: 'legacy_' + Math.random().toString(36).slice(2, 8),
        title: buildTitle(raw.find((m) => m.role === 'user')?.content || 'Previous chat'),
        timestamp: raw[raw.length - 1]?.timestamp || new Date().toISOString(),
        messages: raw,
      }];
    }
    return raw;
  } catch {
    return [];
  }
};

const saveConversations = (convs) => {
  // localStorage can throw: QuotaExceededError on full storage, SecurityError
  // in Safari private mode. Swallow so a write failure doesn't crash the
  // setState updater mid-send (which would leave the UI in an inconsistent
  // state where the message appears but disappears on next render).
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(convs));
  } catch {
    /* in-memory state is still correct; persistence just won't survive reload */
  }
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
  // Coerce to string. Legacy localStorage data from older versions could
  // contain { content: undefined } and .split would throw, taking down the
  // whole widget. React safely escapes string children, so this is also
  // the XSS boundary: anything we render goes through React's text node
  // escaping, never innerHTML.
  return String(content ?? '').split('\n').map((line, i) => {
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
  // Restore the panel's open/closed state across page navigations and
  // reloads so the user doesn't lose context every time they switch routes.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(WIDGET_OPEN_KEY) === '1'; } catch { return false; }
  });
  // Multi-thread state. `conversations` is the source of truth; `activeId`
  // picks which one is rendered. activeConv === null means "no thread open
  // yet, show greeting only" — first user message lazily creates a thread.
  //
  // Critically: we call loadConversations() ONCE and reuse the result for
  // both `conversations` and the initial `activeId`. The legacy-migration
  // branch generates a random id each call, so two calls would produce
  // mismatched ids and activeId would point at a phantom conversation
  // (symptom: user message vanishes, no reply renders).
  const initialConvsRef = useRef(null);
  if (initialConvsRef.current === null) {
    initialConvsRef.current = loadConversations();
  }
  const [conversations, setConversations] = useState(initialConvsRef.current);
  const [activeId, setActiveId] = useState(() => initialConvsRef.current[0]?.id ?? null);
  const [showThreadList, setShowThreadList] = useState(false);
  // Inline rename state for the dropdown. editingId === null means no row
  // is in edit mode. Same pattern as the /ai-chatbot page so the UX feels
  // consistent across both chats.
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  // Count of bot replies that arrived while the panel was closed. Renders
  // as a small red badge on the FAB so users don't miss a reply they
  // requested before closing.
  const [unreadCount, setUnreadCount] = useState(0);
  // User avatar from Profile page (data URL or null). Re-read on open so an
  // edit on /edit-profile reflects without a hard refresh.
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('userAvatar') || null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  // Ref mirror of `open` so async send-message callbacks can check the
  // current state without recapturing the closure.
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // Derived state. Must come before the scroll-to-bottom effect below
  // because that effect references `messages` in its dep array.
  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConv ? activeConv.messages : [];

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, open]);

  useEffect(() => {
    try { localStorage.setItem(WIDGET_OPEN_KEY, open ? '1' : '0'); } catch {}
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (open) {
      setUserAvatar(localStorage.getItem('userAvatar') || null);
      // Opening the panel clears the unread badge; any pending replies
      // are now visible.
      setUnreadCount(0);
    }
  }, [open]);

  // Esc closes the panel when it's open. Standard floating-panel UX.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Skip when Escape was already handled by a child (e.g. the
      // rename input cancels its own edit and calls preventDefault).
      // Otherwise renaming + pressing Escape would also close the panel.
      if (e.defaultPrevented) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  // Same outside-click pattern for the recent-threads dropdown.
  useEffect(() => {
    if (!showThreadList) return;
    const onClick = (e) => {
      if (!e.target.closest?.('.baseera-widget-threadlist-wrapper')) setShowThreadList(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showThreadList]);

  const updateConversations = (updated) => {
    setConversations(updated);
    saveConversations(updated);
  };

  // Wipes every thread. Distinct from "New chat" (which just archives the
  // current one and starts a fresh thread).
  const clearAllThreads = () => {
    if (!conversations.length) return;
    if (window.confirm('Delete ALL chat history? This cannot be undone.')) {
      updateConversations([]);
      setActiveId(null);
    }
  };

  // "New chat" — archive whatever's open and start a fresh, empty thread.
  // The old thread is preserved in the dropdown, not deleted. No confirm
  // because nothing is destroyed.
  const newChat = () => {
    // If the active thread is itself empty, don't pile up empty drafts.
    if (activeConv && activeConv.messages.length === 0) {
      inputRef.current?.focus();
      setShowThreadList(false);
      return;
    }
    setActiveId(null);
    setShowThreadList(false);
    setUnreadCount(0);
    inputRef.current?.focus();
  };

  const switchThread = (id) => {
    setActiveId(id);
    setShowThreadList(false);
  };

  const deleteThread = (id, e) => {
    e?.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    updateConversations(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
  };

  const startRename = (conv, e) => {
    e?.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id) => {
    const trimmed = editTitle.trim();
    // Empty title is a cancel: don't blank-out a thread's name.
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: trimmed } : c
    );
    updateConversations(updated);
    setEditingId(null);
  };

  const cancelRename = () => setEditingId(null);

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
    // Use a blob: URL instead of document.write(). The blob URL opens in an
    // opaque origin so the popup can't read our localStorage (JWT, chats),
    // closing the same-origin XSS escalation path if a crafted bot reply
    // ever slipped past the renderer escaping.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    // Best-effort auto-print, only if the browser actually exposed the
    // window handle (some block popups with noopener). Either way, the
    // blob URL is revoked after a short grace period so it doesn't leak.
    if (win) {
      setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 500);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

    // Lazily create a new conversation if none is active. The thread's title
    // is derived from this first message so it shows up nicely in the
    // dropdown later. We compute updatedConvs synchronously so the awaited
    // reply below knows exactly which thread to write into.
    let convId = activeId;
    let updatedConvs;
    if (!convId) {
      const newConv = {
        id: generateId(),
        title: buildTitle(trimmed),
        timestamp: new Date().toISOString(),
        messages: [userMsg],
      };
      convId = newConv.id;
      updatedConvs = [newConv, ...conversations];
      setActiveId(convId);
    } else {
      updatedConvs = conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMsg], timestamp: new Date().toISOString() }
          : c
      );
    }
    updateConversations(updatedConvs);
    setIsTyping(true);

    // Append the bot reply by reading the LATEST conversations state, not
    // the `updatedConvs` snapshot above. Otherwise any intermediate edit
    // (or even React batching a stale closure) can drop the reply into
    // the wrong array and the bubble never renders.
    const appendBotMsg = (botMsg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        // The convo we wrote into may have been deleted while we awaited
        // the reply. In that case, just resurrect it so the user still
        // sees their reply rather than losing it silently.
        if (idx === -1) {
          const resurrected = {
            id: convId,
            title: buildTitle(trimmed),
            timestamp: new Date().toISOString(),
            messages: [userMsg, botMsg],
          };
          const next = [resurrected, ...prev];
          saveConversations(next);
          return next;
        }
        const next = prev.map((c, i) =>
          i === idx
            ? { ...c, messages: [...c.messages, botMsg], timestamp: new Date().toISOString() }
            : c
        );
        saveConversations(next);
        return next;
      });
    };

    try {
      const data = await apiClient.post('/chat', {
        message: trimmed,
        conversationId: convId,
      });

      const payload = data?.data || data;
      appendBotMsg({
        id: generateId(),
        role: 'bot',
        content: buildBotMessage(payload),
        timestamp: new Date().toISOString(),
      });
      // If the user closed the panel while we were awaiting the reply,
      // surface it as an unread badge on the FAB.
      if (!openRef.current) setUnreadCount((n) => n + 1);
    } catch (err) {
      // Distinguish rate-limit from generic outage so the user knows to
      // wait rather than thinking the AI is broken. 401 is handled by the
      // axios interceptor (redirects to /login), so it never lands here.
      const status = err?.response?.status;
      const content = status === 429
        ? "You're sending messages a bit fast. Please wait a moment and try again."
        : 'Sorry, I could not reach the AI service right now. Please try again later.';
      appendBotMsg({
        id: generateId(),
        role: 'bot',
        content,
        timestamp: new Date().toISOString(),
      });
      if (!openRef.current) setUnreadCount((n) => n + 1);
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
        {!open && unreadCount > 0 && (
          <span className="baseera-widget-unread-badge" aria-label={`${unreadCount} unread`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
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
            <div className="baseera-widget-threadlist-wrapper">
              <button
                className="baseera-widget-clear-btn baseera-widget-threadlist-btn"
                onClick={() => conversations.length && setShowThreadList((v) => !v)}
                aria-label="Chat history"
                title="Chat history"
                disabled={conversations.length === 0}
                style={{ opacity: conversations.length === 0 ? 0.35 : 1 }}
              >
                <i className="fa-solid fa-clock-rotate-left" />
              </button>
              {showThreadList && (
                <div className="baseera-widget-threadlist-menu" role="menu">
                  <div className="baseera-widget-threadlist-header">Recent chats</div>
                  {conversations.length === 0 && (
                    <div className="baseera-widget-threadlist-empty">No chats yet.</div>
                  )}
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className={`baseera-widget-threadlist-item${c.id === activeId ? ' is-active' : ''}${editingId === c.id ? ' is-editing' : ''}`}
                      onClick={() => editingId !== c.id && switchThread(c.id)}
                      role="menuitem"
                    >
                      {editingId === c.id ? (
                        <input
                          className="baseera-widget-threadlist-input"
                          value={editTitle}
                          autoFocus
                          maxLength={60}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              saveRename(c.id);
                            } else if (e.key === 'Escape') {
                              // stopPropagation so Esc here only cancels the
                              // rename and doesn't bubble up to the panel's
                              // window-level Escape listener that would close
                              // the whole widget.
                              e.preventDefault();
                              e.stopPropagation();
                              cancelRename();
                            }
                          }}
                          onBlur={() => saveRename(c.id)}
                        />
                      ) : (
                        <div className="baseera-widget-threadlist-title">{c.title}</div>
                      )}
                      {editingId !== c.id && (
                        <>
                          <button
                            className="baseera-widget-threadlist-rename"
                            onClick={(e) => startRename(c, e)}
                            aria-label="Rename this chat"
                            title="Rename"
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="baseera-widget-threadlist-delete"
                            onClick={(e) => deleteThread(c.id, e)}
                            aria-label="Delete this chat"
                            title="Delete this chat"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="baseera-widget-clear-btn baseera-widget-new-btn"
              onClick={newChat}
              aria-label="New chat"
              title="New chat"
            >
              <i className="fa-solid fa-pen-to-square" />
            </button>
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
              onClick={clearAllThreads}
              aria-label="Delete all chat history"
              title="Delete all chat history"
              disabled={conversations.length === 0}
              style={{ opacity: conversations.length === 0 ? 0.35 : 1 }}
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
            {/* Persistent welcome bubble. Always visible at the top of the
                conversation, even after the user starts chatting. Not pushed
                into messages[] so it isn't persisted to localStorage or
                included in exports. Bottom suggestion chips already cover
                quick-prompt UX, so no chips here. */}
            <div className="baseera-widget-msg bot baseera-widget-greeting">
              <div className="baseera-widget-avatar">
                <img src={baseeraLogo} alt="Baseera" />
              </div>
              <div>
                <div className="baseera-widget-bubble">
                  <p>{buildGreeting()}</p>
                </div>
              </div>
            </div>

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
                    {userAvatar
                      ? <img src={userAvatar} alt="You" />
                      : <i className="fa-solid fa-user" />}
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
