import React, { useState } from "react";
import MarketingNav from "../components/MarketingNav";
import MarketingFooter from "../components/MarketingFooter";
import apiClient from "../api/axios.config";
import "../marketing.css";
import "../content.css";

function Contact() {
  const [formData, setFormData] = useState({ fullName: "", email: "", subject: "", message: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
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
      <MarketingNav />
      <section className="content-hero">
        <div className="content-badge">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </div>
        <h1 className="content-title">Contact <span>us</span></h1>
        <p className="content-lead">Questions, bugs, or feedback? We are here to help. Reach out any time.</p>
      </section>

      <div className="content-body">
        <div className="contact-grid" id="contact-form">
          <div className="contact-panel">
            <h2>Send us a message</h2>
            <p className="sub">Fill out the form and we will get back to you as soon as possible.</p>
            <form onSubmit={handleSubmit}>
              {error && <div className="b-error">{error}</div>}
              <div className="b-field">
                <label className="b-label">Full name</label>
                <input className="b-input" name="fullName" type="text" placeholder="John Doe" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="b-field">
                <label className="b-label">Email address</label>
                <input className="b-input" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="b-field">
                <label className="b-label">Subject</label>
                <input className="b-input" name="subject" type="text" placeholder="How can we help?" value={formData.subject} onChange={handleChange} required />
              </div>
              <div className="b-field">
                <label className="b-label">Message</label>
                <textarea className="b-input" name="message" placeholder="Tell us more about your inquiry…" value={formData.message} onChange={handleChange} required />
              </div>
              <button type="submit" className="b-btn b-btn--primary b-btn--block b-btn--lg" disabled={loading}>
                {loading ? "Sending…" : "Send message"}
              </button>
            </form>
          </div>

          <div>
            <div className="info-card">
              <div className="ii"><i className="fa-solid fa-envelope"></i></div>
              <div><h3>Email</h3><p>0xbaseera@gmail.com</p></div>
            </div>
            <div className="info-card">
              <div className="ii"><i className="fa-solid fa-location-dot"></i></div>
              <div><h3>Location</h3><p>Cairo, Egypt</p></div>
            </div>
            <div className="social-card">
              <h3>Connect with us</h3>
              <a href="https://www.facebook.com/0xBaseera" target="_blank" rel="noopener noreferrer" className="social-link">
                <div className="social-icon"><i className="fa-brands fa-facebook-f"></i></div>
                <div><div className="social-name">Facebook</div><div className="social-url">facebook.com/0xBaseera</div></div>
              </a>
              <a href="https://www.instagram.com/baseeraext/" target="_blank" rel="noopener noreferrer" className="social-link">
                <div className="social-icon"><i className="fa-brands fa-instagram"></i></div>
                <div><div className="social-name">Instagram</div><div className="social-url">instagram.com/baseeraext</div></div>
              </a>
              <a href="https://www.linkedin.com/in/0xbaseeraext/" target="_blank" rel="noopener noreferrer" className="social-link">
                <div className="social-icon"><i className="fa-brands fa-linkedin-in"></i></div>
                <div><div className="social-name">LinkedIn</div><div className="social-url">linkedin.com/in/0xbaseeraext</div></div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="map-wrap">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26195.817002601212!2d30.988065330711343!3d30.56294802862813!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f7d68b68933ea3%3A0x77434af2db2fa06f!2sShebeen%20El-Kom!5e1!3m2!1sen!2seg!4v1771943748180!5m2!1sen!2seg"
          loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Baseera Location" allowFullScreen=""></iframe>
      </div>

      <section className="support">
        <div className="support-card">
          <h2>Need immediate support?</h2>
          <p>Our team is here to help with any security concern or technical issue you run into.</p>
          <a className="b-btn b-btn--primary b-btn--lg" href="#contact-form">Get support</a>
        </div>
      </section>

      <MarketingFooter />

      {showPopup && (
        <div className="b-modal" role="dialog" aria-modal="true">
          <div className="b-modal-back" onClick={() => setShowPopup(false)} />
          <div className="b-modal-card">
            <div className="b-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
            </div>
            <h3>Message sent</h3>
            <p>Your message has been sent. We will get back to you soon.</p>
            <button className="b-btn b-btn--primary b-btn--block" onClick={() => setShowPopup(false)}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}

export default Contact;
