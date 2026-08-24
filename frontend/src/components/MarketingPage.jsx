import React from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import ExtensionDemo from './ExtensionDemo';
import { WEBSTORE_LINK_PROPS } from '../utils/extensionLink';
import '../marketing.css';

/**
 * The Baseera marketing page. `authed=false` renders the public Home (guest
 * hero, sign-up CTAs); `authed=true` renders Landing (member hero, dashboard
 * CTAs). Everything below the hero is shared so the two never drift.
 */
export default function MarketingPage({ authed = false }) {
  return (
    <>
      <MarketingNav />

      {/* HERO */}
      <section className="hero">
        <div>
          <span className="b-eyebrow"><span className="dot"></span>31 passive scanners · 100% client-side · AI-powered</span>
          <h1>Security <em>clarity</em>,<br />one click away.</h1>
          <p className="hero-sub">Baseera (Arabic: بصيرة, meaning "insight") is a Chrome extension that scans any webpage for vulnerabilities in real time, explains every finding in plain language, and never touches your server.</p>
          <div className="hero-actions">
            <a className="b-btn b-btn--chrome b-btn--lg" {...WEBSTORE_LINK_PROPS}>
              <ChromeIcon /> Add to Chrome, free
            </a>
            {authed
              ? <Link className="b-btn b-btn--ghost b-btn--lg" to="/bugs">Open dashboard →</Link>
              : <Link className="b-btn b-btn--ghost b-btn--lg" to="/register">Get started →</Link>}
          </div>
          <p className="hero-note"><strong>No code. No setup. No server access.</strong> Just install and click the icon.</p>
        </div>
        <ExtensionDemo authed={authed} />
      </section>

      {/* TRUST */}
      <div className="trust">
        <span className="trust-lbl">Scanners for</span>
        <div className="trust-logos">
          {['SQL Injection', 'XSS', 'Exposed Secrets', 'Weak CSP', 'Clickjacking', 'CORS', 'Open Redirect'].map((s) => (
            <span className="trust-logo" key={s}>{s}</span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="stats">
        <div className="stat"><div className="stat-num">31<span>+</span></div><div className="stat-lbl">Passive vulnerability scanners across 4 severity tiers</div></div>
        <div className="stat"><div className="stat-num">0</div><div className="stat-lbl">Requests sent to your server during a scan</div></div>
        <div className="stat"><div className="stat-num">2<span>s</span></div><div className="stat-lbl">Average time to first finding on any page</div></div>
      </div>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="b-sec-eyebrow">What we find</div>
        <h2 className="b-sec-title">Security gaps you didn't<br />know were there</h2>
        <p className="b-sec-sub">Baseera reads what your page already exposes: DOM, headers, scripts and storage. It never modifies anything or makes a single extra request.</p>
        <div className="feat-grid">
          <Feature icon={<BoltIcon />} title="Stolen data risks" tag="SQL Injection · Command Injection"
            desc="Spots SQL injection and command injection points that could let an attacker extract passwords, payment data, and user records directly from your database." />
          <Feature icon={<CodeIcon />} title="Script hijacking" tag="XSS · CSRF · Insecure postMessage"
            desc="Finds reflected and DOM-based XSS where malicious code could run inside your visitors' browsers, causing silent session theft, credential capture, or redirects." />
          <Feature icon={<KeyIcon />} title="Exposed secrets" tag="API Keys · Tokens · Passwords"
            desc="Catches API keys, database credentials, and auth tokens accidentally left in public JavaScript bundles or server responses, before attackers find them first." />
          <Feature icon={<ShieldIcon />} title="Weak server config" tag="Headers · HTTPS · CORS · Cookies"
            desc="Checks security headers, HTTPS enforcement, CORS rules, and cookie flags to protect against clickjacking, sniffing, and protocol downgrade attacks." />
        </div>
      </section>

      {/* AI */}
      <section className="section ai-section" id="ai">
        <div className="ai-inner">
          <div>
            <div className="b-sec-eyebrow">AI Assistant</div>
            <h2 className="b-sec-title">Every finding,<br />explained in plain English</h2>
            <p className="b-sec-sub">Baseera's built-in AI doesn't just flag vulnerabilities. It tells you what they mean, why they matter, and exactly how to fix them. No security degree required.</p>
            <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link className="b-btn b-btn--primary" to="/ai-chatbot">Try the AI Assistant →</Link>
              {!authed && <Link className="b-btn b-btn--ghost" to="/login">Sign in</Link>}
            </div>
          </div>
          <div className="chat-card">
            <div className="chat-head">
              <div className="chat-avatar"><RobotIcon /></div>
              <span className="chat-name">Baseera AI</span>
              <div className="chat-online"><span className="pip" style={{ width: '5px', height: '5px', boxShadow: 'none' }}></span>Online</div>
            </div>
            <div className="chat-body">
              <div className="bubble user">What is SQL Injection?</div>
              <div className="bubble ai"><strong>SQL Injection</strong> (Severity: Critical)<br /><br />SQL Injection occurs when an attacker inserts or manipulates SQL queries via user-supplied input, allowing them to read, modify, or delete database data.<br /><br /><strong>Fix:</strong> Use parameterized queries / prepared statements. Apply input validation and least-privilege DB accounts. Use an ORM and avoid dynamic SQL concatenation.</div>
              <div className="bubble user">Tell me about CSRF</div>
              <div className="bubble ai"><strong>Cross-Site Request Forgery (CSRF)</strong> (Severity: Medium)<br /><br />CSRF tricks authenticated users into submitting unwanted requests, allowing attackers to perform actions on their behalf.<br /><br /><strong>Fix:</strong> Use CSRF tokens on all state-changing forms. Validate the Origin/Referer header. Use the SameSite=Strict or SameSite=Lax cookie attribute.</div>
            </div>
            <div className="chat-input-row">
              <span className="chat-placeholder">Ask about any vulnerability…</span>
              <button className="chat-send" aria-label="send"><svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg></button>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="section steps-section" id="how">
        <div className="b-sec-eyebrow">How it works</div>
        <h2 className="b-sec-title">Simple by design</h2>
        <p className="b-sec-sub">No agents to install, no credentials to hand over, no learning curve. Baseera does all the work in your browser.</p>
        <div className="steps-grid">
          <div className="step"><div className="step-num">01</div><div className="step-title">Install the extension</div><p className="step-desc">Add Baseera to Chrome from the Web Store in one click. No account needed to start your first scan.</p></div>
          <div className="step"><div className="step-num">02</div><div className="step-title">Scan any page</div><p className="step-desc">Navigate to any site and click the Baseera icon. All 31 scanners run locally in your browser, and nothing is sent to our servers during the scan.</p></div>
          <div className="step"><div className="step-num">03</div><div className="step-title">Understand and fix</div><p className="step-desc">Every finding comes with a severity score, a plain-English explanation from the AI assistant, and a step-by-step fix guide you can actually follow.</p></div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <span className="b-eyebrow" style={{ marginBottom: '20px' }}><span className="dot"></span>Free forever for personal use</span>
        <h2 className="cta-title">Know before<br />they do.</h2>
        <p className="cta-sub">Start scanning for free. No card, no setup, results in seconds.</p>
        <div className="cta-actions">
          <a className="b-btn b-btn--chrome b-btn--lg" {...WEBSTORE_LINK_PROPS}><ChromeIcon /> Add to Chrome, free</a>
          {authed
            ? <Link className="b-btn b-btn--ghost b-btn--lg" to="/bugs">Open dashboard →</Link>
            : <Link className="b-btn b-btn--ghost b-btn--lg" to="/register">Create an account →</Link>}
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}

function Feature({ icon, title, desc, tag }) {
  return (
    <div className="feat-card">
      <div className="feat-icon">{icon}</div>
      <div className="feat-title">{title}</div>
      <p className="feat-desc">{desc}</p>
      <span className="feat-tag">{tag}</span>
    </div>
  );
}

/* inline icons */
const ChromeIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="4" fill="currentColor" opacity=".9" /><path d="M12 8h8.5A10 10 0 0 0 3.5 6.5L7.8 14A4 4 0 0 1 12 8z" fill="currentColor" opacity=".7" /><path d="M3.5 6.5A10 10 0 0 0 3.5 17.5l4.3-7.4" fill="currentColor" opacity=".5" /><path d="M12 16a4 4 0 0 1-3.6-2.3L4.1 21A10 10 0 0 0 20.5 17.5H12z" fill="currentColor" opacity=".6" /></svg>);
const BoltIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>);
const CodeIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 6 3 12 8 18" /><polyline points="16 6 21 12 16 18" /></svg>);
const KeyIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l2 2M15 8l2 2" /></svg>);
const ShieldIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" /></svg>);
const RobotIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4M9 14h.01M15 14h.01" /></svg>);
