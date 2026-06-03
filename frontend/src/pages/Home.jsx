import React from "react";
import "../index.css";
import "../landing-modern.css";
import { useScrollReveal, useCountUp } from "../hooks/useScrollReveal";
import { Link } from 'react-router-dom'

import {
  ShieldCheck,
  Sparkles,
  Check,
  Download,
  Info,
  Zap,
  Activity,
  Database,
  KeyRound,
  Network,
  ArrowRight,
} from "lucide-react";

import icon11 from "../assets/ImageWithFallback.png";
import icon14 from "../assets/img1.jpg";
import icon15 from "../assets/img2.jpg";
import Fotter from "../components/Fotter";
import Navbar from "../components/Navbar";

/* 🔹 Lightning Component */
const CardLightning = ({ position }) => {
  return (
    <div className={`card-lightning ${position}`}>
      <Zap size={18} strokeWidth={2.5} />
    </div>
  );
};

function Home() {
  useScrollReveal();
  useCountUp();
  return (
    <>
    <Navbar/>
      {/* ================= Home Section ================= */}
      <section className="home">
        <div className="home-inner">
          <div className="home-badge reveal reveal-zoom">
            <ShieldCheck size={20} strokeWidth={2.2} className="lucide-accent" />
            <span>Open Source · Privacy-First</span>
          </div>

          <h2 className="home-title reveal reveal-delay-1">
            Find Web Vulnerabilities In{" "}
            <span className="text">
              <br />
              One Click
            </span>
          </h2>

          <p className="home-subtitle reveal reveal-delay-2">
            Baseera is a passive web security scanner that detects 28 classes
            of vulnerabilities, from XSS and SQL injection to leaked API keys
            and missing security headers, without ever modifying the page or
            sending data to third parties.
          </p>

          <div className="home-actions reveal reveal-delay-3">
                <Link className="get-btn" to="/Login">
                                  Get Started <ArrowRight size={18} strokeWidth={2.4} />
                                  </Link>
      <Link className="ghost-btn" to="/About">
                                Learn More
                                </Link>

          </div>

          <div className="mouse">
            <div className="mouse-wheel"></div>
          </div>
        </div>
      </section>

      {/* ================= Extension Section ================= */}
      <section className="extension-section">
        <div className="extension-download-section" id="download">
          <div className="extension-container">
            {/* -------- Left -------- */}
            <div className="extension-left reveal reveal-left">
              <div className="home-badge">
                <Sparkles size={20} strokeWidth={2.2} className="lucide-accent" />
                <span>Chrome Extension</span>
              </div>

              <div className="text-sec2">
                <h2>Install The Baseera Extension</h2>
                <p>
                  Add Baseera to Chrome and scan any website with a single
                  click. The extension runs 28 passive scanners directly in
                  your browser. No requests sent, no page modifications, no
                  tracking.
                </p>
              </div>

              <div className="small-icon">
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>28 scanners across Critical, High, Medium, Low</h6>
                </div>
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>Built-in AI assistant explains every finding</h6>
                </div>
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>100% client-side, your data never leaves your browser</h6>
                </div>
              </div>

              <div className="Download-Extension">
                <button className="btn-download">
                  <Download size={18} strokeWidth={2.2} />
                  <span>Download Extension</span>
                </button>
              </div>

              <div className="footer-text">
                <h6>
                  <Info size={16} strokeWidth={2.2} className="lucide-muted" />
                  Works on Chrome, Edge, and other Chromium browsers
                </h6>
              </div>
            </div>

            {/* -------- Right / Card -------- */}
            <div className="extension-right reveal reveal-right">
              <div className="extension-card">
                <div className="card-browser-header">
                  <div className="browser-dots">
                    <div className="browser-dot red"></div>
                    <div className="browser-dot yellow"></div>
                    <div className="browser-dot green"></div>
                  </div>

                  <div className="browser-url-bar">
                    <ShieldCheck size={14} strokeWidth={2.4} className="lucide-accent" />
                    <span>Baseera Security</span>
                  </div>
                </div>

                <CardLightning position="top-right" />

                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <div className="card-icon">
                      <ShieldCheck size={40} strokeWidth={2} className="lucide-accent" />
                    </div>
                  </div>

                  <h3 className="card-title">Baseera Security</h3>
                  <p className="card-subtitle">
                    Real-time web vulnerability scanner
                  </p>

                  <div className="card-stats">
                    <div className="stat-item">
                      <span className="stat-number count-up" data-target="247">247</span>
                      <span className="stat-label">Scans</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number count-up" data-target="12">12</span>
                      <span className="stat-label">Critical</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number count-up" data-target="4.9">4.9</span>
                      <span className="stat-label">Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* -------- End Right -------- */}
          </div>
          {/* -------- Lightning Icon -------- */}
          <div className="extension-lightning bottom-left">
            <Zap size={28} strokeWidth={2.4} className="lucide-accent" />
          </div>
        </div>
      </section>

      {/* ================= Security Solutions Section ================= */}
      <section className="security-solutions-section">
        <div className="security-solutions-container reveal">
          <p className="security-badge">What Baseera Detects</p>
          <h2 className="security-title">Vulnerability Coverage</h2>
          <p className="security-description">
            Baseera ships with 28 scanners covering the OWASP Top 10 and
            beyond. Each finding is mapped to a severity tier and explained
            in plain language by the built-in AI assistant.
          </p>
        </div>

        <div className="security-solutions-cards">
          <div className="security-solution-card reveal reveal-delay-1">
            <div className="security-icon network">
              <Network size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Injection &amp; XSS</h3>
            <p className="par-sec3">
              SQL injection, command injection, reflected and DOM-based XSS
              sinks.
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-2">
            <div className="security-icon data">
              <Database size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Exposed Secrets</h3>
            <p className="par-sec3">
              Leaked API keys (OpenAI, Stripe, AWS), JWTs, and private keys
              in scripts and comments.
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-3">
            <div className="security-icon monitoring">
              <Activity size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Headers &amp; CSP</h3>
            <p className="par-sec3">
              Missing or weak CSP, HSTS, Permissions-Policy, COOP, and
              clickjacking defences.
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-4">
            <div className="security-icon access">
              <KeyRound size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Auth &amp; Sessions</h3>
            <p className="par-sec3">
              Insecure cookies, session tokens in URLs, sensitive
              autocomplete, and weak storage.
            </p>
          </div>
        </div>
      </section>

      {/* ================= Protection Services Section ================= */}
      <section className="protection-services-section">
        <div className="protection-container">
          {/* Left - Content */}
          <div className="protection-left reveal reveal-left">
            <div className="home-badge">
              <ShieldCheck size={20} strokeWidth={2.2} className="lucide-accent" />
              <span>How It Works</span>
            </div>

            <h2 className="protection-title">
              Designed To Be{" "}
              <br />
              <span className="text">Safe And Transparent</span>
            </h2>

            <p className="protection-description">
              Baseera is intentionally passive: every scanner reads the DOM
              only and never sends requests, modifies the page, or runs
              third-party code. You see exactly what is checked and why.
            </p>

            <div className="protection-features">
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Read-only, no traffic generated, no pages modified</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>User-initiated. Scans run only when you click</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>No analytics, no ads, no third-party trackers</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Findings explained by an in-app AI assistant</span>
              </div>
            </div>

    
              <a className="get-btn" href="#protection">
                                See How Baseera Works
                                </a>
            
          </div>

          {/* Right - Image */}
          <div className="protection-right reveal reveal-right">
            <img
              src={icon11}
              alt="Security Professional"
              className="protection-image"
            />
          </div>
        </div>
      </section>

{/* ================= Protection Services Section 01 ================= */}
<section className="protection-our-services-section01 " id="protection">
  <h1 className="headline reveal">
    Two Steps From Browsing <br />
    <span className="text">To A Full Security Report</span>
  </h1>
  <div className="our-services-container">
        <div className="our-services-right reveal reveal-left">
          <img
        src={icon14}
        alt="Security Assessment"
        className="our-services-image"
      />
        </div>

          <div className="our-services-left reveal reveal-right">
    <div className="number-badge">
        <h1 className="number">01</h1>
      </div>
<div className="security-icon-network">
              <Network size={28} strokeWidth={1.8} className="lucide-accent" />
            </div>
      <h2 className="protection-title">Scan Any Page</h2>

      <p className="protection-description">
      Open the website you want to inspect, click the Baseera icon, and hit
      Start Scan. All 28 scanners run locally against the page&apos;s DOM and
      surface findings within seconds. No installation per site, no
      configuration.
      </p>

      <Link to="/About" className="read-more-btn">
        Learn More <ArrowRight size={16} strokeWidth={2.4} />
      </Link>
    </div>
  </div>


  
</section>
    <section className="protection-our-services-section02">
      <div className="our-services2-container">
        <div className="our-services-right reveal reveal-left">
    <div className="number-badge">
        <h1 className="number">02</h1>
      </div>
<div className="security-icon-network">
              <Zap size={28} strokeWidth={2} className="lucide-accent" />
            </div>
      <h2 className="protection-title">Review &amp; Fix</h2>

      <p className="protection-description">
      Findings are grouped by severity and synced to your Bugs Dashboard if
      you&apos;re signed in. Ask the built-in AI assistant what each issue
      means and how to fix it, with concrete examples for every
      vulnerability type.
      </p>

      <Link to="/bugs" className="read-more-btn">
        Open Dashboard <ArrowRight size={16} strokeWidth={2.4} />
      </Link>
    </div>
        <div className="our-services-left reveal reveal-right">
      <img
        src={icon15}
        alt="Security Assessment"
        className="our-services-image"
      />
  </div>
        </div>

    </section>
    {/* secure the web section */}
    <section className="Secure-the-web">
      <h1 className="secure-text reveal">
    <span className="text">Built</span> For The Modern Web</h1>
    <p className="Secure-description reveal reveal-delay-1">A focused, honest toolkit
       for finding common web vulnerabilities. Designed and built as a graduation
       project, free for anyone to use.</p>
         <div className="security-solutions-cards">
          <div className="security-solution-card reveal reveal-delay-1">
            <div className="security-icon network">
              <Network size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">28</h3>
            <p className="par-sec3">
            Vulnerability Scanners
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-2">
            <div className="security-icon data">
              <KeyRound size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">4</h3>
            <p className="par-sec3">
              Severity Tiers
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-3">
            <div className="security-icon monitoring">
              <Zap size={32} strokeWidth={2} className="lucide-accent" />
            </div>
            <h3 className="text-sec3"> 100% </h3>
            <p className="par-sec3">Client-Side &amp; Passive</p>
          </div>

          <div className="security-solution-card reveal reveal-delay-4">
            <div className="security-icon access">
              <Activity size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Free</h3>
            <p className="par-sec3">Forever, No Sign-up Required</p>
          </div>
        </div>
          <div className="start-btn reveal reveal-delay-5" > <a href="#download">Install The Extension</a>

          </div>
    </section>
    <Fotter />
   </> 
  );
}

export default Home;