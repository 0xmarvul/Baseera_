import React from "react";
import "../index.css";
import { Link } from 'react-router-dom'

import icon1 from "../assets/Icon(1).png";
import icon2 from "../assets/Icon(2).png";
import icon3 from "../assets/Icon(3).png";
import icon4 from "../assets/Icon(4).png";
import icon5 from "../assets/Icon(5).png";
import icon6 from "../assets/Icon(6).png";
import icon7 from "../assets/SystemMonitoring.png";
import icon8 from "../assets/DataProtection.png";
import icon9 from "../assets/AccessControl.png";
import icon10 from "../assets/networksecurity.png";
import icon11 from "../assets/ImageWithFallback.png";
import icon12 from "../assets/Icon(9).png";
import icon13 from "../assets/Icon(6).png";
import icon14 from "../assets/img1.jpg";
import icon15 from "../assets/img2.jpg";
import icon16 from "../assets/logo.png"
import icon17 from "../assets/telephone.png"
import icon18 from "../assets/location.png"
import icon19 from "../assets/Email.png"
import Fotter from "../components/Fotter";
import Navbar from "../components/Navbar";

/* 🔹 Lightning Component */
const CardLightning = ({ position, icon }) => {
  return (
    <div className={`card-lightning ${position}`}>
      <img src={icon} alt="lightning icon" />
    </div>
  );
};

function Home() {
  return (
    <>
    <Navbar/>
      {/* ================= Home Section ================= */}
      <section className="home">
        <div className="home-inner">
          <div className="home-badge">
            <img src={icon1} alt="security icon" width={20} height={20} />
            <span>Trusted Security Solutions</span>
          </div>

          <h2 className="home-title">
            We&apos;re The Experts In{" "}
            <span className="text">
              <br />
              Security Vetting
            </span>
          </h2>

          <p className="home-subtitle">
            Comprehensive security solutions designed to protect your
            organization from evolving cyber threats. Trust our expertise to
            safeguard your digital assets.
          </p>

          <div className="home-actions">
                <Link className="get-btn" to="/Login">
                                  Get Started <i className="arrow fa-solid fa-arrow-right"></i>
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
            <div className="extension-left">
              <div className="home-badge">
                <img src={icon2} alt="security icon" width={20} height={20} />
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
                  <img src={icon3} alt="check icon" />
                  <h6>Real-time vulnerability scanning</h6>
                </div>
                <div className="feature-item">
                  <img src={icon3} alt="check icon" />
                  <h6>Instant security alerts & notifications</h6>
                </div>
                <div className="feature-item">
                  <img src={icon3} alt="check icon" />
                  <h6>Comprehensive vulnerability reports</h6>
                </div>
              </div>

              <div className="Download-Extension">
                <button className="btn-download">
                  <img src={icon4} alt="download" />
                  <span>Download Extension</span>
                </button>
              </div>

              <div className="footer-text">
                <h6>
                  <img src={icon5} alt="info icon" />
                  Compatible with Chrome, Edge, and Brave
                </h6>
              </div>
            </div>

            {/* -------- Right / Card -------- */}
            <div className="extension-right">
              <div className="extension-card">
                <div className="card-browser-header">
                  <div className="browser-dots">
                    <div className="browser-dot red"></div>
                    <div className="browser-dot yellow"></div>
                    <div className="browser-dot green"></div>
                  </div>

                  <div className="browser-url-bar">
                    <img src={icon1} alt="shield icon" />
                    <span>Baseera Security</span>
                  </div>
                </div>

                <CardLightning position="top-right" icon={icon4} />

                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <div className="card-icon">
                      <img src={icon1} alt="security icon" />
                    </div>
                  </div>

                  <h3 className="card-title">Baseera Security</h3>
                  <p className="card-subtitle">
                    Real-time web vulnerability scanner
                  </p>

                  <div className="card-stats">
                    <div className="stat-item">
                      <span className="stat-number">247</span>
                      <span className="stat-label">Scans</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">12</span>
                      <span className="stat-label">Critical</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">4.9</span>
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
            <img src={icon6} alt="lightning icon" />
          </div>
        </div>
      </section>

      {/* ================= Security Solutions Section ================= */}
      <section className="security-solutions-section">
        <div className="security-solutions-container">
          <p className="security-badge">To Enhance Your Cyber Defences</p>
          <h2 className="security-title">Expert Will Support</h2>
          <p className="security-description">
            Our comprehensive security services are designed to protect your
            organization from the latest cyber threats with cutting-edge
            technology.
          </p>
        </div>

        <div className="security-solutions-cards">
          <div className="security-solution-card">
            <div className="security-icon network">
              <img src={icon10} alt="Network Security" />
            </div>
            <h3 className="text-sec3">Network Security</h3>
            <p className="par-sec3">
              Advanced protection for your network infrastructure
            </p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon data">
              <img src={icon8} alt="Data Protection" />
            </div>
            <h3 className="text-sec3">Data Protection</h3>
            <p className="par-sec3">
              Secure your sensitive data with encryption
            </p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon monitoring">
              <img src={icon7} alt="System Monitoring" />
            </div>
            <h3 className="text-sec3">System Monitoring</h3>
            <p className="par-sec3">24/7 monitoring and threat detection</p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon access">
              <img src={icon9} alt="Access Control" />
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
          <div className="protection-left">
            <div className="home-badge">
              <img src={icon12} alt="security icon" width={20} height={20} />
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
                <img src={icon3} alt="check icon" />
                <span>Real-time threat detection and response</span>
              </div>
              <div className="protection-feature-item">
                <img src={icon3} alt="check icon" />
                <span>Automated encryption protocols</span>
              </div>
              <div className="protection-feature-item">
                <img src={icon3} alt="check icon" />
                <span>Compliance with industry standards</span>
              </div>
              <div className="protection-feature-item">
                <img src={icon3} alt="check icon" />
                <span>Expert security consultation</span>
              </div>
            </div>

    
              <a className="get-btn" href="#protection">
                                Learn More About Protection{" "}
                                </a>
            
          </div>

          {/* Right - Image */}
          <div className="protection-right">
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
  <h1 className="headline">
    You Can Protect Your Organizations <br />
    <span className="text">Cybersecurity By Our Services</span>
  </h1>
  <div className="our-services-container">
        <div className="our-services-right">
          <img
        src={icon14}
        alt="Security Assessment"
        className="our-services-image"
      />
        </div>
        
          <div className="our-services-left">
    <div className="number-badge">
        <h1 className="number">01</h1> 
      </div>
<div className="security-icon-network">
              <img src={icon10} alt="Network Security" />
            </div>
      <h2 className="protection-title">Security Assessment</h2>

      <p className="protection-description">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fuget in liam nascetur 
      lorem feli massa ultricies. Duis comlecten lorus id neque, commodo lseus et nembus.
      </p>

      <button className="read-more-btn">
        Read More <i className="arrow fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </div>


  
</section>
    <section className="protection-our-services-section02">
      <div className="our-services2-container">
        <div className="our-services-right">
    <div className="number-badge">
        <h1 className="number">02</h1> 
      </div>
<div className="security-icon-network">
              <img src={icon6} alt="Network Security" />
            </div>
      <h2 className="protection-title">Threat Detection</h2>

      <p className="protection-description">
      Advanced monitoring systems that identify and neutralize potential threats before they can cause damage to your organization's infrastructure.
      </p>

      <button className="read-more-btn">
        Read More <i className="arrow fa-solid fa-arrow-right"></i>
      </button>
    </div>
        <div className="our-services-left">
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
      <h1 className="secure-text">
    <span className="text">Secure</span> The Web</h1>
    <p className="Secure-description">Join thousands of organizations
       trusting our security solutions to protect their digital presence.</p>
         <div className="security-solutions-cards">
          <div className="security-solution-card">
            <div className="security-icon network">
              <img src={icon10} alt="Network Security" />
            </div>
            <h3 className="text-sec3">500+</h3>
            <p className="par-sec3">
            Protected Networks
            </p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon data">
              <img src={icon9} alt="Data Protection" />
            </div>
            <h3 className="text-sec3">1M+</h3>
            <p className="par-sec3">
              Threats Blocked
            </p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon monitoring">
              <img src={icon6} alt="System Monitoring" />
            </div>
            <h3 className="text-sec3"> &lt;1min </h3>
            <p className="par-sec3">Response Time</p>
          </div>

          <div className="security-solution-card">
            <div className="security-icon access">
              <img src={icon5} alt="Access Control" />
            </div>
            <h3 className="text-sec3">24/7</h3>
            <p className="par-sec3">Global Coverage</p>
          </div>
        </div>
          <div className="start-btn" > <a href="#download">Start Securing Your Web Today</a>
           
          </div>
    </section>
    <Fotter />
   </> 
  );
}

export default Home;