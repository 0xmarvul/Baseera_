import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { WEBSTORE_LINK_PROPS } from '../utils/extensionLink';

export default function MarketingFooter() {
  return (
    <footer className="mfoot">
      <div className="mfoot-top">
        <div>
          <div className="mfoot-brand"><Logo size={24} /> Baseera</div>
          <p>A passive web vulnerability scanner. Free, open, and built to make web security clear.</p>
        </div>
        <div>
          <h6>Product</h6>
          <ul>
            <li><a {...WEBSTORE_LINK_PROPS}>Extension</a></li>
            <li><Link to="/bugs">Dashboard</Link></li>
            <li><Link to="/ai-chatbot">AI Assistant</Link></li>
          </ul>
        </div>
        <div>
          <h6>Company</h6>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><a href="https://0xmarvul.github.io/Baseera/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy</a></li>
          </ul>
        </div>
        <div>
          <h6>Contact</h6>
          <ul>
            <li><a href="mailto:baseera.security@gmail.com">baseera.security@gmail.com</a></li>
            <li>Cairo, Egypt</li>
          </ul>
        </div>
      </div>
      <div className="mfoot-bottom">
        <span>© 2026 Baseera. All rights reserved.</span>
        <span style={{ fontFamily: 'var(--fm)' }}>بصيرة · insight</span>
      </div>
    </footer>
  );
}
