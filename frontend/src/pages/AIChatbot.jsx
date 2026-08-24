import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Logo from '../components/Logo';
import apiClient from '../api/axios.config';
import '../aichat.css';

// Prompts the rule-based backend engine actually understands (it matches on
// vulnerability names). Generic questions fall through to a default reply.
const SUGGESTED = [
  'What is SQL Injection?',
  'How do I fix XSS?',
  'Tell me about CSRF',
  'What is an exposed API key?',
];

const generateId = () => Math.random().toString(36).slice(2, 10);
// Per-user storage key so a user's chat history survives their own
// logout -> login (clearUserSession only wipes the legacy shared key, not
// these per-user ones), while still not leaking to a different account.
const convKey = () => `baseera_conversations__${localStorage.getItem('baseeraUserName') || 'me'}`;
const loadConversations = () => { try { return JSON.parse(localStorage.getItem(convKey()) || '[]'); } catch { return []; } };
const saveConversations = (c) => localStorage.setItem(convKey(), JSON.stringify(c));
const buildTitle = (msg) => { const t = msg.slice(0, 38); return t.length < msg.length ? t + '…' : t; };
const buildBotMessage = (payload) => {
  if (!payload) return 'No response received.';
  const { vulnerability, explanation, severity, fix } = payload;
  let msg = '';
  if (vulnerability) msg += `**${vulnerability}** (Severity: ${severity})\n\n`;
  if (explanation) msg += explanation + '\n\n';
  if (fix) msg += `**Fix:** ${fix}`;
  return msg.trim() || 'No analysis available.';
};

export default function AIChatbot() {
  const location = useLocation();
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const seededRef = useRef(false);

  const name = localStorage.getItem('baseeraUserName') || '';
  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConv ? activeConv.messages : [];

  const update = (c) => { setConversations(c); saveConversations(c); };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  useEffect(() => {
    if (seededRef.current) return;
    const seed = location.state?.seed;
    if (seed) { seededRef.current = true; sendMessage(seed); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isTyping) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';

    const userMsg = { id: generateId(), role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    let convId = activeId;
    let convs = [...conversations];
    if (!convId) {
      const conv = { id: generateId(), title: buildTitle(trimmed), preview: trimmed, timestamp: new Date().toISOString(), messages: [userMsg] };
      convs = [conv, ...conversations]; convId = conv.id;
    } else {
      convs = convs.map((c) => c.id === convId ? { ...c, messages: [...c.messages, userMsg], preview: trimmed, timestamp: new Date().toISOString(), title: c.messages.length === 0 ? buildTitle(trimmed) : c.title } : c);
    }
    setActiveId(convId); update(convs); setIsTyping(true);

    try {
      const data = await apiClient.post('/chat', { message: trimmed, conversationId: convId });
      const payload = data?.data || data;
      const botMsg = { id: generateId(), role: 'bot', content: buildBotMessage(payload), rawData: payload, timestamp: new Date().toISOString() };
      update(convs.map((c) => c.id === convId ? { ...c, messages: [...c.messages, botMsg] } : c));
    } catch {
      const errorMsg = { id: generateId(), role: 'bot', content: 'Sorry, I could not reach the AI service right now. Please try again in a moment.', timestamp: new Date().toISOString() };
      update(convs.map((c) => c.id === convId ? { ...c, messages: [...c.messages, errorMsg] } : c));
    } finally { setIsTyping(false); }
  };

  const newChat = () => { setActiveId(null); setInput(''); setShowHistory(false); };
  const deleteConv = (id, e) => { e.stopPropagation(); const next = conversations.filter((c) => c.id !== id); update(next); if (activeId === id) setActiveId(null); };
  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const onInput = (e) => { setInput(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; };

  const renderBody = (content) => content.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line.split(/\*\*(.+?)\*\*/g).map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      {i < content.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <DashboardLayout>
      <div className="chatpage">
        <div className="chat-top">
          <div className="ct-left">
            <div className="ct-av"><Logo size={24} pupil="#0c1626" /></div>
            <div>
              <div className="ct-title">Baseera AI <span className="ct-badge">● online</span></div>
              <div className="ct-sub">Explains your findings and how to fix them. It never runs scans.</div>
            </div>
          </div>
          <div className="ct-actions">
            <button className="cbtn" onClick={newChat}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>New chat</button>
            <button className="cbtn" onClick={() => setShowHistory((v) => !v)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>History</button>
          </div>
          {showHistory && (
            <div className="history-menu">
              {conversations.length === 0 ? <div className="hempty">No conversations yet</div> : conversations.map((c) => (
                <div key={c.id} className={`hrow ${c.id === activeId ? 'on' : ''}`} onClick={() => { setActiveId(c.id); setShowHistory(false); }}>
                  <span className="ht">{c.title}</span>
                  <span className="hd" onClick={(e) => deleteConv(c.id, e)}><i className="fa-solid fa-trash"></i></span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-scroll">
          {messages.length === 0 && !isTyping ? (
            <div className="welcome">
              <div className="wmark"><Logo size={34} pupil="#060D18" /></div>
              <h2>Hey{name ? ` ${name}` : ''}, I'm Baseera AI</h2>
              <p>Ask me about any vulnerability, or one of your findings. I will explain what it means and exactly how to fix it. No security background needed.</p>
            </div>
          ) : (
            <div className="thread">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}>
                  <div className="av">{m.role === 'user' ? (name.charAt(0) || 'U') : <Logo size={21} pupil="#0c1626" />}</div>
                  <div className="body">
                    <div className="mname">{m.role === 'user' ? 'You' : 'Baseera AI'}</div>
                    <div className="mbody">{renderBody(m.content)}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="msg ai">
                  <div className="av"><Logo size={21} pupil="#0c1626" /></div>
                  <div className="body"><div className="mname">Baseera AI</div><div className="typing"><i></i><i></i><i></i></div></div>
                </div>
              )}
              <div ref={endRef}></div>
            </div>
          )}
        </div>

        <div className="chat-bottom">
          <div className="bwrap">
            <div className="suggests">
              {SUGGESTED.map((s) => <span key={s} className="schip" onClick={() => sendMessage(s)}>{s}</span>)}
            </div>
            <div className="composer">
              <textarea ref={taRef} rows={1} value={input} onChange={onInput} onKeyDown={onKeyDown} placeholder="Ask about any vulnerability or one of your findings…" />
              <button className="send" onClick={() => sendMessage()} disabled={isTyping || !input.trim()} aria-label="Send">
                <svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </button>
            </div>
            <div className="disc">Baseera AI explains findings and fixes. It does not run scans or send data to third parties.</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
