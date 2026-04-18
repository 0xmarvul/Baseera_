import React from "react";
import "../index.css";

import "../components/Navbar"

import "../about.css";


import { Link, useNavigate } from 'react-router-dom'

import icon1 from "../assets/about.png";
import icon2 from "../assets/Mission.png";
import icon3 from "../assets/networksecurity.png";
import icon4 from "../assets/Row.png";
import icon5 from "../assets/Icon(6).png";
import icon7 from "../assets/lock.png";
import icon8 from "../assets/support.png";
import icon9 from "../assets/yes.png";  
import Navbar from "../components/Navbar";
import LandingNavbar from "../components/LandingNavbar";
import Fotter from "../components/Fotter";



function About() {
    const navigate = useNavigate();
    const isAuthenticated = !!localStorage.getItem('authToken');

    const handleGetStarted = (e) => {
        if (isAuthenticated) {
            e.preventDefault();
            navigate('/landing#Extension');
        }
    };

    const handleLearnMore = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
    <>
       <LandingNavbar/>
        <section className="about-section">
            <div className="about-icon">
                <img src={icon1} alt="about icon" width={30} height={30} />
            </div>
            <div className="about">
            <div className="about-title">
                <h1>About <span className="about-text">Baseera</span></h1>
                    <div className="about-description">
Baseera (meaning "insight" or "vision" in Arabic) is a modern cybersecurity platform designed to help organizations discover, understand, and fix security vulnerabilities with clarity and precision.            </div>
            </div>
            </div>
            <section className="our-Mission">
            <div className="box">
            <div className="mission-icon">
    <img src={icon2} alt=" Mission icon" width={30} height={30} />
            </div>
            <div className="mission-text">
                <h4 className="mission-title">
                    Our Mission
                </h4>
                <p className="mission-description">
                    To empower organizations worldwide with cutting-edge cybersecurity intelligence, making vulnerability management accessible, efficient, and actionable. We believe every team deserves clear insight into their security posture, enabling them to protect what matters most and focus on growth rather than just defense.
                </p>
            </div>
            </div>
            </section>

            {/* what do section */}
            <section className="What-We-Do">
                <h1 className="do-title">
                    What We Do
                </h1>
                <div className="do">
            <div className="do-box">
                <div className="do-icon">
            <img src={icon3} alt="  icon" width={24} height={24} />
        </div>
          <div className="content">
                <h4 className="do-title">
                    Vulnerability Discovery
                </h4>
                <p className="do-description">
            Advanced scanning to identify security weaknesses across your infrastructure
                </p>
                </div>
            </div>
             <div className="do-box">
                 <div className="do-icon">
             <img src={icon2} alt="  icon" width={24} height={24} />
        </div>
         <div className="content">
                <h4 className="do-title">
                Smart Prioritization
                </h4>
                <p className="do-description">
  AI-powered risk assessment to focus on what matters most
                </p>
                </div>
            </div>
               
              <div className="do-box">
                 <div className="do-icon">
             <img src={icon5} alt="  icon" width={24} height={24} />
        </div>
        <div className="content">
                <h4 className="do-title">
                  Fast Remediation
                </h4>
                <p className="do-description">
           Clear, actionable steps to fix issues quickly and effectively
                </p>
            </div>
            </div>
  <div className="do-box">
                 <div className="do-icon">
             <img src={icon4} alt="  icon" width={24} height={24} />
        </div>
        <div className="content">
                <h4 className="do-title">
                 Comprehensive Reporting
                </h4>
                <p className="do-description">
Beautiful reports that communicate security posture clearly                </p>
            </div>
            </div>
</div>      
            </section>
        </section>
{/* ================= WHY BASEERA SECTION ================= */}
<section className="why-section">
    <h1 className="why-section-title">Why Baseera?</h1>
    
    <div className="why-cards-container">
        {/* Card 1 */}
        <div className="why-card">
            <div className="why-icon">
                <img src={icon9} alt="icon" width={24} height={24} />
            </div>
            <div className="why-content">
                <h4 className="why-title">Clarity and Insight</h4>
                <p className="why-description">
                    Baseera means "insight" in Arabic - we provide clear visibility into your security posture
                </p>
            </div>
        </div>

        {/* Card 2 */}
        <div className="why-card">
            <div className="why-icon">
                <img src={icon8} alt="icon" width={24} height={24} />
            </div>
            <div className="why-content">
                <h4 className="why-title">Expert Support</h4>
                <p className="why-description">
                    World-class security experts dedicated to protecting your digital assets
                </p>
            </div>
        </div>

        {/* Card 3 */}
        <div className="why-card">
            <div className="why-icon">
                <img src={icon7} alt="icon" width={24} height={24} />
            </div>
            <div className="why-content">
                <h4 className="why-title">Enterprise-Grade Security</h4>
                <p className="why-description">
                    Trusted by organizations worldwide with industry-leading compliance and standards
                </p>
            </div>
        </div>
    </div>
</section>
<section className="join-section">
<div className="join-container">
    <div className="join-content">
  <h2 className="join-title">Ready to Secure Your Digital Assets?</h2>
  <p className="join-description">
    Join thousands of organizations that trust Baseera to protect their infrastructure and maintain a strong security posture.
  </p>
  
  <div className="home-actions">
                 <Link className="get-btn" to={isAuthenticated ? "/landing#Extension" : "/Login"} onClick={handleGetStarted}>
                             Get Started  <i className="arrow fa-solid fa-arrow-right"></i>
            
                               </Link> 
            <button className="ghost-btn" onClick={handleLearnMore}>Learn More</button>
          </div>
          </div>
</div>
</section>


    <Fotter />
    </>
    );
}

export default About;