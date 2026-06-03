import React from "react";
import LandingNavbar from "../components/LandingNavbar";
import "../index.css";
import "../landing-modern.css";
import { useScrollReveal, useCountUp } from "../hooks/useScrollReveal";

import { Link } from 'react-router-dom'
import { useNavigate } from "react-router-dom";

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

/* 🔹 Lightning Component */
const CardLightning = ({ position }) => {
  return (
    <div className={`card-lightning ${position}`}>
      <Zap size={18} strokeWidth={2.5} />
    </div>
  );
};

function Landing() {
  const navigate = useNavigate();
  useScrollReveal();
  useCountUp();

  const handleLogout = () => {
    localStorage.removeItem("isAuth");
    navigate("/login");
  };

  return (
    <>
    <LandingNavbar />
      {/* ================= Home Section ================= */}
      <section className="home">
        <div className="home-inner">
          <div className="home-badge reveal reveal-zoom">
            <ShieldCheck size={20} strokeWidth={2.2} className="lucide-accent" />
            <span>Trusted Security Solutions</span>
          </div>

          <h2 className="home-title reveal reveal-delay-1">
            We&apos;re The Experts In{" "}
            <span className="text">
              <br />
              Security Vetting
            </span>
          </h2>

          <p className="home-subtitle reveal reveal-delay-2">
            Comprehensive security solutions designed to protect your
            organization from evolving cyber threats. Trust our expertise to
            safeguard your digital assets.
          </p>

          <div className="home-actions reveal reveal-delay-3" style={{ justifyContent: 'center' }}>
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
      <section className="extension-section" id="Extension">
        <div className="extension-download-section" id="download">
          <div className="extension-container">
            {/* -------- Left -------- */}
            <div className="extension-left reveal reveal-left">
              <div className="home-badge">
                <Sparkles size={20} strokeWidth={2.2} className="lucide-accent" />
                <span>New Release</span>
              </div>

              <div className="text-sec2">
                <h2>Download Our Browser Extension</h2>
                <p>
                  Install the Baseera extension to scan websites instantly and
                  detect vulnerabilities in real time. Stay protected while
                  browsing with automatic security analysis.
                </p>
              </div>

              <div className="small-icon">
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>Real-time vulnerability scanning</h6>
                </div>
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>Instant security alerts &amp; notifications</h6>
                </div>
                <div className="feature-item">
                  <Check size={18} strokeWidth={3} className="lucide-check" />
                  <h6>Comprehensive vulnerability reports</h6>
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
                  Compatible with Chrome, Edge, and Brave
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
          <p className="security-badge">To Enhance Your Cyber Defences</p>
          <h2 className="security-title">Expert Will Support</h2>
          <p className="security-description">
            Our comprehensive security services are designed to protect your
            organization from the latest cyber threats with cutting-edge
            technology.
          </p>
        </div>

        <div className="security-solutions-cards">
          <div className="security-solution-card reveal reveal-delay-1">
            <div className="security-icon network">
              <Network size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Network Security</h3>
            <p className="par-sec3">
              Advanced protection for your network infrastructure
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-2">
            <div className="security-icon data">
              <Database size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Data Protection</h3>
            <p className="par-sec3">
              Secure your sensitive data with encryption
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-3">
            <div className="security-icon monitoring">
              <Activity size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">System Monitoring</h3>
            <p className="par-sec3">24/7 monitoring and threat detection</p>
          </div>

          <div className="security-solution-card reveal reveal-delay-4">
            <div className="security-icon access">
              <KeyRound size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">Access Control</h3>
            <p className="par-sec3">Multi-layer authentication systems</p>
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
              <span>Protection Services</span>
            </div>

            <h2 className="protection-title">
              We Can Protect Your
              <br />
              <span className="text">Organizations Cybersecurity</span>
            </h2>

            <p className="protection-description">
              With our comprehensive protection services, we ensure your
              organization remains secure from all cyber threats and
              vulnerabilities.
            </p>

            <div className="protection-features">
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Real-time threat detection and response</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Automated encryption protocols</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Compliance with industry standards</span>
              </div>
              <div className="protection-feature-item">
                <Check size={18} strokeWidth={3} className="lucide-check" />
                <span>Expert security consultation</span>
              </div>
            </div>

    
              <a className="get-btn" href="#protection">
                                Learn More About Protection{" "}
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
    You Can Protect Your Organizations <br />
    <span className="text">Cybersecurity By Our Services</span>
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
      <h2 className="protection-title">Security Assessment</h2>

      <p className="protection-description">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fuget in liam nascetur
      lorem feli massa ultricies. Duis comlecten lorus id neque, commodo lseus et nembus.
      </p>

      <button className="read-more-btn">
        Read More <ArrowRight size={16} strokeWidth={2.4} />
      </button>
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
      <h2 className="protection-title">Threat Detection</h2>

      <p className="protection-description">
      Advanced monitoring systems that identify and neutralize potential threats before they can cause damage to your organization's infrastructure.
      </p>

      <button className="read-more-btn">
        Read More <ArrowRight size={16} strokeWidth={2.4} />
      </button>
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
    <span className="text">Secure</span> The Web</h1>
    <p className="Secure-description reveal reveal-delay-1">Join thousands of organizations
       trusting our security solutions to protect their digital presence.</p>
         <div className="security-solutions-cards">
          <div className="security-solution-card reveal reveal-delay-1">
            <div className="security-icon network">
              <Network size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3 count-up" data-target="500+">500+</h3>
            <p className="par-sec3">
            Protected Networks
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-2">
            <div className="security-icon data">
              <KeyRound size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">1M+</h3>
            <p className="par-sec3">
              Threats Blocked
            </p>
          </div>

          <div className="security-solution-card reveal reveal-delay-3">
            <div className="security-icon monitoring">
              <Zap size={32} strokeWidth={2} className="lucide-accent" />
            </div>
            <h3 className="text-sec3"> &lt;1min </h3>
            <p className="par-sec3">Response Time</p>
          </div>

          <div className="security-solution-card reveal reveal-delay-4">
            <div className="security-icon access">
              <Activity size={32} strokeWidth={1.8} className="lucide-accent" />
            </div>
            <h3 className="text-sec3">24/7</h3>
            <p className="par-sec3">Global Coverage</p>
          </div>
        </div>
          <div className="start-btn reveal reveal-delay-5" > <a href="#Extension">Start Securing Your Web Today</a>

          </div>
    </section>
    <Fotter />
    </>
  );
}

export default Landing;