import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { WEBSTORE_LINK_PROPS } from '../utils/extensionLink';

/**
 * Top navigation for the public / marketing pages (Home, About, Contact,
 * auth pages). Reflects auth state: signed-out shows Sign in + Get started,
 * signed-in shows Dashboard + the user's name.
 */
export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    setIsAuthed(!!localStorage.getItem('authToken'));
    setName(localStorage.getItem('baseeraUserName') || '');
  }, []);

  return (
    <nav className={`mnav ${open ? 'open' : ''}`}>
      <Link className="mnav-brand" to={isAuthed ? '/landing' : '/'}>
        <Logo size={26} />
        Baseera
      </Link>

      <ul className="mnav-links">
        <li><Link to={isAuthed ? '/landing' : '/'}>Home</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/contact">Contact</Link></li>
        <li><a {...WEBSTORE_LINK_PROPS}>Extension</a></li>
        {isAuthed && <li><Link to="/bugs">Dashboard</Link></li>}
      </ul>

      <div className="mnav-actions">
        {isAuthed ? (
          <>
            {name && <span className="mnav-username">Hi, {name}</span>}
            <Link className="b-btn b-btn--primary" to="/bugs">Dashboard</Link>
          </>
        ) : (
          <>
            <Link className="b-btn b-btn--ghost" to="/login">Sign in</Link>
            <Link className="b-btn b-btn--primary" to="/register">Get started</Link>
          </>
        )}
      </div>

      <button className="mnav-toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`}></i>
      </button>
    </nav>
  );
}
