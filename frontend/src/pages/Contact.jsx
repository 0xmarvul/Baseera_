import React, { useState } from "react";
import "../index.css";
import "../contact.css";
import Navbar from "../components/Navbar";
import LandingNavbar from "../components/LandingNavbar";
import Fotter from "../components/Fotter";
import apiClient from "../api/axios.config";

function Contact() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/contact", formData);
      setShowPopup(true);
      setFormData({ fullName: "", email: "", subject: "", message: "" });
    } catch {
      setError("Failed to send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
       <LandingNavbar/>
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <div className="contact-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" 
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="contact-hero-title">
            Contact <span className="highlight">Us</span>
          </h1>
          <p className="contact-hero-subtitle">
            We're here to help. Reach out to us anytime.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-content" id="contact-form">
        <div className="contact-container">
          {/* Left Side - Form */}
          <div className="contact-form-wrapper">
            <div className="contact-form-header">
              <h2 className="form-section-title">Send us a Message</h2>
              <p className="form-section-subtitle">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              {error && <div className="form-error-msg">{error}</div>}
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-label" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  className="form-input"
                  placeholder="How can we help you?"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Message */}
              <div className="form-group">
                <label className="form-label" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="form-textarea"
                  placeholder="Tell us more about your inquiry..."
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="submit-btn" disabled={loading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* Right Side - Contact Info */}
          <div className="contact-info-wrapper">
            {/* Email */}
            <div className="info-card">
              <div className="info-icon email-icon">
                <i class="fa-solid fa-envelope"></i>
              </div>
              <div className="info-content">
                <h3 className="info-title">Email Address</h3>
                <p className="info-text">0xbaseera@gmail.com</p>
              </div>
            </div>

            {/* Phone */}
            <div className="info-card">
              <div className="info-icon phone-icon">
                <i class="fa-solid fa-phone"></i>
              </div>
              <div className="info-content">
                <h3 className="info-title">Phone Number</h3>
                <p className="info-text">+1 (555) 123-4567</p>
              </div>
            </div>

            {/* Location */}
            <div className="info-card">
              <div className="info-icon location-icon">
                 <i class="fa-solid fa-location-dot"></i>
              </div>
              <div className="info-content">
                <h3 className="info-title">Location</h3>
                <p className="info-text">Cairo, Egypt</p>
              </div>
            </div>

            {/* Social Media */}
            <div className="social-card">
              <h3 className="social-title">Connect With Us</h3>
              
              <a href="https://www.facebook.com/0xBaseera" target="_blank" rel="noopener noreferrer" className="social-link" style={{textDecoration: 'none'}}>
                <div className="social-icon">
                  <i className="fa-brands fa-facebook-f" style={{color: 'white', fontSize: '18px'}}></i>
                </div>
                <div className="social-content">
                  <h4 className="social-name">Facebook</h4>
                  <p className="social-url">facebook.com/0xBaseera</p>
                </div>
              </a>

              <a href="https://www.instagram.com/baseeraext/" target="_blank" rel="noopener noreferrer" className="social-link" style={{textDecoration: 'none'}}>
                <div className="social-icon">
                  <i className="fa-brands fa-instagram" style={{color: 'white', fontSize: '18px'}}></i>
                </div>
                <div className="social-content">
                  <h4 className="social-name">Instagram</h4>
                  <p className="social-url">instagram.com/baseeraext</p>
                </div>
              </a>

              <a href="https://www.linkedin.com/in/0xbaseeraext/" target="_blank" rel="noopener noreferrer" className="social-link" style={{textDecoration: 'none'}}>
                <div className="social-icon">
                  <i className="fa-brands fa-linkedin-in" style={{color: 'white', fontSize: '18px'}}></i>
                </div>
                <div className="social-content">
                  <h4 className="social-name">LinkedIn</h4>
                  <p className="social-url">linkedin.com/in/0xbaseeraext</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="map-container">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26195.817002601212!2d30.988065330711343!3d30.56294802862813!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f7d68b68933ea3%3A0x77434af2db2fa06f!2sShebeen%20El-Kom%2C%20Qism%20Shebeen%20El-Kom%2C%20Shibin%20el%20Kom%2C%20Menofia%20Governorate!5e1!3m2!1sen!2seg!4v1771943748180!5m2!1sen!2seg" 
            width="100%" 
            height="400" 
            style={{border: 0, borderRadius: '20px'}} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Baseera Location"
          ></iframe>
        </div>
      </section>

      {/* Support Section */}
      <section className="support-section">
        <div className="support-card">
          <h2 className="support-title">Need Immediate Support?</h2>
          <p className="support-text">
            Our support team is available 24/7 to help you with any security concerns or technical
            issues you may encounter.
          </p>
          <a className="support-btn" href="#contact-form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Get Support
          </a>
        </div>
      </section>

      {/* Footer Component */}
      <Fotter />

      {showPopup && (
        <div className="contact-popup" role="dialog" aria-modal="true">
          <div className="contact-popup-backdrop" onClick={() => setShowPopup(false)} />
          <div className="contact-popup-card">
            <div className="contact-popup-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="contact-popup-title">Message Sent</h3>
            <p className="contact-popup-text">
              Your message has been sent successfully. We will get back to you soon.
            </p>
            <button
              type="button"
              className="contact-popup-btn"
              onClick={() => setShowPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Contact;