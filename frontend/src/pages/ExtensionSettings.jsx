import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { clearUserSession } from "../utils/session";
import { WEBSTORE_LINK_PROPS } from "../utils/extensionLink";
import "../account.css";

function ExtensionSettings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("baseeraUserData");
    if (userData) { try { setEmail(JSON.parse(userData).email || ""); } catch { setEmail(""); } }
  }, []);

  const handleLogout = () => {
    clearUserSession();
    window.postMessage({ type: "BASEERA_AUTH_LOGOUT" }, "*");
    window.location.href = "/login";
  };

  return (
    <DashboardLayout>
      <div className="acct-wrap">
        <div className="acct-head"><h1>Settings</h1><p>Manage your account, extension, and session.</p></div>

        <div className="acct-card">
          <h2>Extension</h2>
          <p className="cardsub">Baseera scans run inside the Chrome extension. Results sync here automatically while you are signed in.</p>
          <div className="acct-row"><span className="k">Status</span><span className="v" style={{ color: 'var(--accent)' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', marginRight: 8 }}></span>Connected · v1.0.1</span></div>
          <div className="acct-row"><span className="k">Signed in as</span><span className="v">{email || 'this account'}</span></div>
          <div className="acct-actions">
            <a className="b-btn b-btn--ghost" {...WEBSTORE_LINK_PROPS}>Open Chrome Web Store</a>
          </div>
        </div>

        <div className="acct-card">
          <h2>Account</h2>
          <p className="cardsub">Update your profile details or the password you sign in with.</p>
          <div className="acct-actions">
            <button className="b-btn b-btn--ghost" onClick={() => navigate("/profile")}>Manage profile</button>
            <button className="b-btn b-btn--ghost" onClick={() => navigate("/change-password")}>Change password</button>
            <button className="b-btn b-btn--ghost" onClick={handleLogout}>Sign out</button>
          </div>
        </div>

        <div className="acct-card danger">
          <h2 style={{ color: 'var(--crit)' }}>Danger zone</h2>
          <p className="cardsub">Permanently delete your account and all associated data.</p>
          <Link to="/delete" className="b-btn" style={{ background: 'rgba(255,92,107,.1)', color: 'var(--crit)', border: '1px solid rgba(255,92,107,.3)' }}>Delete account</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default ExtensionSettings;
