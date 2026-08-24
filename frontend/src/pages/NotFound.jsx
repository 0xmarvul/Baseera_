import React from "react";
import { Link } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { Home, LayoutDashboard, ArrowLeft } from "lucide-react";

function NotFound() {
  const isLoggedIn = !!localStorage.getItem("authToken");
  return (
    <>
      <MarketingNav />
      <section className="auth-wrap">
        <div style={{ textAlign: 'center', position: 'relative', maxWidth: 520 }}>
          <span className="b-eyebrow"><span className="dot"></span>Error 404</span>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(90px,18vw,150px)', fontWeight: 700, lineHeight: 1, margin: '18px 0 4px', background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 26, marginBottom: 10 }}>Page not found</h2>
          <p style={{ color: 'var(--t2)', maxWidth: '44ch', margin: '0 auto 28px', lineHeight: 1.6 }}>The page you are looking for does not exist or has moved. Try one of the links below.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={isLoggedIn ? "/landing" : "/"} className="b-btn b-btn--primary b-btn--lg"><Home size={18} /> Go home</Link>
            {isLoggedIn && <Link to="/bugs" className="b-btn b-btn--ghost b-btn--lg"><LayoutDashboard size={18} /> Dashboard</Link>}
            <button type="button" onClick={() => window.history.back()} className="b-btn b-btn--ghost b-btn--lg"><ArrowLeft size={18} /> Go back</button>
          </div>
        </div>
      </section>
    </>
  );
}
export default NotFound;
