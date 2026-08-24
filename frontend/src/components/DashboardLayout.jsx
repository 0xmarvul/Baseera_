import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { clearUserSession } from '../utils/session';
import { WEBSTORE_LINK_PROPS } from '../utils/extensionLink';
import '../dashboard.css';

const NAV = [
  { to: '/bugs', label: 'Dashboard', icon: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></> },
  { to: '/ai-chatbot', label: 'AI Assistant', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { to: '/profile', label: 'Profile', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> },
  { to: '/extension-settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></> },
];

export default function DashboardLayout({ children, badge }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const name = localStorage.getItem('baseeraUserName') || 'User';
  const initial = name.charAt(0) || 'U';
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || null);

  // Keep the sidebar avatar in sync when it changes on the Profile page
  // (custom event) or in another tab (storage event).
  useEffect(() => {
    const refresh = () => setAvatar(localStorage.getItem('userAvatar') || null);
    window.addEventListener('baseera-avatar', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('baseera-avatar', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const logout = () => { clearUserSession(); navigate('/login'); };

  return (
    <div className="dapp">
      <aside className="side">
        <Link className="brand" to="/landing"><Logo size={26} pupil="#08111F" /> Baseera</Link>
        <div className="nav-lbl">Workspace</div>
        {NAV.map((n) => {
          const active = pathname === n.to || (n.to === '/bugs' && pathname === '/landing');
          return (
            <Link key={n.to} to={n.to} className={`nav-item ${active ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
              {n.label}
              {n.label === 'Dashboard' && badge != null && badge > 0 && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
        <div className="spacer"></div>
        <a className="ext-cta" {...WEBSTORE_LINK_PROPS}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <div><div className="es-t">Scan a page</div><div className="es-s">Get the Baseera extension</div></div>
        </a>
        <div className="user">
          <div className="avatar">{avatar ? <img src={avatar} alt={name} /> : initial}</div>
          <div>
            <div className="un">{name}</div>
            <button className="logout" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <main className="dmain">
        <div className="dmobile-top">
          <Link className="brand" to="/landing"><Logo size={22} pupil="#060D18" /> Baseera</Link>
          <button className="logout" onClick={logout} style={{ background: 'none', border: 0, color: 'var(--t2)', cursor: 'pointer' }}>Sign out</button>
        </div>
        {children}
      </main>
    </div>
  );
}
