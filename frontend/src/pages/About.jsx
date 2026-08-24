import React from "react";
import { Link } from 'react-router-dom';
import { Eye, Target, Network, FileText, Zap, Lock, Headphones, ArrowRight, Sparkles } from "lucide-react";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import { WEBSTORE_LINK_PROPS } from "../utils/extensionLink";
import "../marketing.css";
import "../content.css";

function About() {
  const isAuthed = !!localStorage.getItem('authToken');

  const doItems = [
    { icon: <Network size={22} />, title: "Passive detection", desc: "31 scanners read the DOM of the page you choose and report findings. No requests sent, nothing modified." },
    { icon: <Sparkles size={22} />, title: "Severity triage", desc: "Every finding is mapped to Critical, High, Medium, or Low so you know what to fix first." },
    { icon: <Zap size={22} />, title: "AI explanations", desc: "Ask the in-app assistant what any vulnerability means and how to fix it. Answers in plain language." },
    { icon: <FileText size={22} />, title: "Persistent dashboard", desc: "Sign in to sync scan results to your dashboard and track findings over time." },
  ];
  const whyItems = [
    { icon: <Eye size={22} />, title: "Clarity and insight", desc: "Baseera means \"insight\" in Arabic, and that is the goal: clear visibility into what is actually wrong with the page you are looking at." },
    { icon: <Headphones size={22} />, title: "Open and free", desc: "No paywalls, no signup required to use the extension, no third-party analytics. Sign in only if you want to sync findings to a dashboard." },
    { icon: <Lock size={22} />, title: "Privacy by design", desc: "All scanning runs in your browser. The extension only reads the page you choose to scan, only when you click Start Scan." },
  ];

  return (
    <>
      <MarketingNav />
      <section className="content-hero">
        <div className="content-badge"><Eye size={30} strokeWidth={2} /></div>
        <h1 className="content-title">About <span>Baseera</span></h1>
        <p className="content-lead">Baseera (meaning "insight" or "vision" in Arabic) is a focused web security toolkit that helps developers and students discover, understand, and fix the most common classes of web vulnerabilities, all from a single Chrome extension and dashboard.</p>
      </section>

      <div className="content-body">
        <div className="mission">
          <div className="mi"><Target size={26} strokeWidth={2} /></div>
          <div>
            <h3>Our mission</h3>
            <p>To make web security review accessible to anyone with a browser. Most vulnerability scanners are paid, complex, or invasive. Baseera proves that a passive, transparent, in-browser scanner can still cover 31 real vulnerability classes, and explain each one in language a developer can act on.</p>
          </div>
        </div>

        <h2 className="content-section-title">What we do</h2>
        <div className="feat-grid">
          {doItems.map((d) => (
            <div className="feat-card" key={d.title}>
              <div className="feat-icon">{d.icon}</div>
              <div className="feat-title">{d.title}</div>
              <p className="feat-desc">{d.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="content-section-title">Why Baseera?</h2>
        <div className="feat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {whyItems.map((w) => (
            <div className="feat-card" key={w.title}>
              <div className="feat-icon">{w.icon}</div>
              <div className="feat-title">{w.title}</div>
              <p className="feat-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="cta">
        <h2 className="cta-title">Ready to scan<br />your first site?</h2>
        <p className="cta-sub">Install the extension, open any page, and run Baseera against it. No account needed to get started.</p>
        <div className="cta-actions">
          <a className="b-btn b-btn--chrome b-btn--lg" {...WEBSTORE_LINK_PROPS}>Add to Chrome, free</a>
          <Link className="b-btn b-btn--ghost b-btn--lg" to={isAuthed ? "/bugs" : "/register"}>
            {isAuthed ? "Open dashboard" : "Create an account"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}

export default About;
