import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { authApi } from "../api/authApi";
import { clearUserSession } from "../utils/session";
import "../account.css";

const readCached = () => {
  try {
    const raw = localStorage.getItem("baseeraUserData");
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { name: p.fullName || "User", username: "@" + (p.username || "user"), email: p.email || "", country: p.country || "", accountCreated: "", bio: p.bio || "" };
  } catch { return null; }
};

const splitName = (full) => { const p = (full || '').trim().split(/\s+/); return { firstName: p[0] || '', lastName: p.slice(1).join(' ') || '' }; };

function Profile() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(localStorage.getItem("userAvatar") || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userData, setUserData] = useState(() => readCached() || { name: "User", username: "@user", email: "", country: "", accountCreated: "", bio: "" });
  // Full profile fields, needed so avatar saves include the backend-required
  // Country (a partial {profileImageUrl} update is rejected by the validator).
  const [profileRaw, setProfileRaw] = useState(() => {
    const c = readCached(); const { firstName, lastName } = splitName(c?.name);
    return { username: (c?.username || '@user').replace(/^@/, ''), email: c?.email || '', firstName, lastName, country: c?.country || '', bio: c?.bio || '' };
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => { if (!e.target.closest?.('.acct-avatar-wrap')) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    authApi.getProfile().then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        if (d.profileImageUrl) { localStorage.setItem("userAvatar", d.profileImageUrl); setAvatar(d.profileImageUrl); window.dispatchEvent(new Event('baseera-avatar')); }
        setUserData({
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || "User",
          username: "@" + d.username, email: d.email, country: d.country || "",
          accountCreated: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "", bio: d.bio || "",
        });
        setProfileRaw({ username: d.username || '', email: d.email || '', firstName: d.firstName || '', lastName: d.lastName || '', country: d.country || '', bio: d.bio || '' });
      }
    }).catch(() => {});
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 150; let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const b64 = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(objectUrl);
      setAvatar(b64); localStorage.setItem("userAvatar", b64);
      window.dispatchEvent(new Event('baseera-avatar'));
      // Full payload (incl. Country) so the update passes validation and the
      // image actually persists server-side across sessions.
      authApi.updateProfile({ ...profileRaw, profileImageUrl: b64 }).catch(() => {});
    };
    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
  };

  const handleDeleteAvatar = () => {
    if (!window.confirm('Delete your profile picture?')) return;
    setMenuOpen(false); setAvatar(null); localStorage.removeItem('userAvatar');
    window.dispatchEvent(new Event('baseera-avatar'));
    authApi.updateProfile({ ...profileRaw, profileImageUrl: '' }).catch(() => {});
  };

  const logout = () => { clearUserSession(); window.postMessage({ type: 'BASEERA_AUTH_LOGOUT' }, '*'); window.location.href = '/login'; };
  const initial = (userData.name || 'U').charAt(0);

  return (
    <DashboardLayout>
      <div className="acct-wrap">
        <div className="acct-head"><h1>Profile</h1><p>Manage your account details and security.</p></div>

        <div className="acct-card">
          <div className="acct-profile-top">
            <div className="acct-avatar-wrap" style={{ position: 'relative' }}>
              <div className="acct-avatar">{avatar ? <img src={avatar} alt={userData.name} /> : initial}</div>
              <input type="file" id="avatar-upload" accept="image/*" onChange={(e) => { setMenuOpen(false); handleImageUpload(e); }} style={{ display: 'none' }} />
              <button type="button" onClick={() => setMenuOpen((v) => !v)} title="Photo options"
                style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%', background: 'var(--grad)', border: '2px solid var(--s1)', color: '#04121A', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i>
              </button>
              {menuOpen && (
                <div className="export-menu" style={{ left: 0, right: 'auto', top: '100%' }}>
                  <label htmlFor="avatar-upload" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}><i className="fa-solid fa-camera"></i> Change picture</label>
                  <button onClick={handleDeleteAvatar} disabled={!avatar} style={{ color: 'var(--crit)' }}><i className="fa-solid fa-trash"></i> Remove picture</button>
                </div>
              )}
            </div>
            <div>
              <div className="acct-name">{userData.name}</div>
              <div className="acct-email">{userData.username}</div>
              {userData.bio && <p style={{ color: 'var(--t2)', fontSize: 13, marginTop: 6, maxWidth: '40ch' }}>{userData.bio}</p>}
            </div>
          </div>

          <div className="acct-row"><span className="k">Email</span><span className="v">{userData.email || '—'}</span></div>
          <div className="acct-row"><span className="k">Country</span><span className="v">{userData.country || '—'}</span></div>
          <div className="acct-row"><span className="k">Member since</span><span className="v">{userData.accountCreated || '—'}</span></div>

          <div className="acct-actions" style={{ marginTop: 18 }}>
            <button className="b-btn b-btn--primary" onClick={() => navigate('/edit-profile')}><i className="fa-solid fa-pen"></i> Edit profile</button>
            <button className="b-btn b-btn--ghost" onClick={() => navigate('/change-password')}><i className="fa-solid fa-key"></i> Change password</button>
            <button className="b-btn b-btn--ghost" onClick={logout}><i className="fa-solid fa-arrow-right-from-bracket"></i> Sign out</button>
          </div>
        </div>

        <div className="acct-card danger">
          <h2 style={{ color: 'var(--crit)' }}>Danger zone</h2>
          <p className="cardsub">Permanently delete your account and all its data.</p>
          <button className="b-btn" style={{ background: 'rgba(255,92,107,.1)', color: 'var(--crit)', border: '1px solid rgba(255,92,107,.3)' }} onClick={() => navigate('/delete')}><i className="fa-solid fa-trash"></i> Delete account</button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;
