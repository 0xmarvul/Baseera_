import React from "react";
import "../index.css";

import "../components/Navbar"

import "../about.css";


import { Link, useNavigate } from 'react-router-dom'

import {
  Eye,
  Target,
  Network,
  FileText,
  Zap,
  Lock,
  Headphones,
  ArrowRight,
  Sparkles,
} from "lucide-react";

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
                <Eye size={30} strokeWidth={2} className="lucide-accent" />
            </div>
            <div className="about">
            <div className="about-title">
                <h1>About <span className="about-text">Baseera</span></h1>
                    <div className="about-description">
Baseera (meaning &quot;insight&quot; or &quot;vision&quot; in Arabic) is a focused web security toolkit that helps developers and students discover, understand, and fix the most common classes of web vulnerabilities, all from a single Chrome extension and dashboard.            </div>
            </div>
            </div>
            <section className="our-Mission">
            <div className="box">
            <div className="mission-icon">
    <Target size={30} strokeWidth={2} className="lucide-accent" />
            </div>
            <div className="mission-text">
                <h4 className="mission-title">
                    Our Mission
                </h4>
                <p className="mission-description">
                    To make web security review accessible to anyone with a browser. Most vulnerability scanners are paid, complex, or invasive. Baseera proves that a passive, transparent, in-browser scanner can still cover 28 real vulnerability classes, and explain each one in language a developer can act on.
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
            <Network size={24} strokeWidth={2} className="lucide-accent" />
        </div>
          <div className="content">
                <h4 className="do-title">
                    Passive Detection
                </h4>
                <p className="do-description">
            28 scanners read the DOM of the page you choose and report findings. No requests sent, nothing modified.
                </p>
                </div>
            </div>
             <div className="do-box">
                 <div className="do-icon">
             <Sparkles size={24} strokeWidth={2} className="lucide-accent" />
        </div>
         <div className="content">
                <h4 className="do-title">
                Severity Triage
                </h4>
                <p className="do-description">
  Every finding is mapped to Critical, High, Medium, or Low so you know what to fix first.
                </p>
                </div>
            </div>

              <div className="do-box">
                 <div className="do-icon">
             <Zap size={24} strokeWidth={2} className="lucide-accent" />
        </div>
        <div className="content">
                <h4 className="do-title">
                  AI Explanations
                </h4>
                <p className="do-description">
           Ask the in-app assistant what any vulnerability means and how to fix it. Answers in plain language.
                </p>
            </div>
            </div>
  <div className="do-box">
                 <div className="do-icon">
             <FileText size={24} strokeWidth={2} className="lucide-accent" />
        </div>
        <div className="content">
                <h4 className="do-title">
                 Persistent Dashboard
                </h4>
                <p className="do-description">
Sign in to sync scan results to your Bugs Dashboard and track findings over time.                </p>
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
                <Eye size={24} strokeWidth={2} className="lucide-accent" />
            </div>
            <div className="why-content">
                <h4 className="why-title">Clarity And Insight</h4>
                <p className="why-description">
                    Baseera means &quot;insight&quot; in Arabic, and that&apos;s the goal: clear visibility into what is actually wrong with the page you&apos;re looking at.
                </p>
            </div>
        </div>

        {/* Card 2 */}
        <div className="why-card">
            <div className="why-icon">
                <Headphones size={24} strokeWidth={2} className="lucide-accent" />
            </div>
            <div className="why-content">
                <h4 className="why-title">Open &amp; Free</h4>
                <p className="why-description">
                    No paywalls, no signup required to use the extension, no third-party analytics. Sign in only if you want to sync findings to a dashboard.
                </p>
            </div>
        </div>

        {/* Card 3 */}
        <div className="why-card">
            <div className="why-icon">
                <Lock size={24} strokeWidth={2} className="lucide-accent" />
            </div>
            <div className="why-content">
                <h4 className="why-title">Privacy By Design</h4>
                <p className="why-description">
                    All scanning runs in your browser. The extension cannot read pages in the background. Only the one you choose to scan, only when you click Start Scan.
                </p>
            </div>
        </div>
    </div>
</section>
<section className="join-section">
<div className="join-container">
    <div className="join-content">
  <h2 className="join-title">Ready To Scan Your First Site?</h2>
  <p className="join-description">
    Install the extension, open any page, and run Baseera against it. No account needed to get started. Sign in only if you want your findings saved.
  </p>
  
  <div className="home-actions">
                 <Link className="get-btn" to={isAuthenticated ? "/landing#Extension" : "/Login"} onClick={handleGetStarted}>
                             Get Started <ArrowRight size={18} strokeWidth={2.4} />
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