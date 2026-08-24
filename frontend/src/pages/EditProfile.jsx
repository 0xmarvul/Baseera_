import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { authApi } from "../api/authApi";
import { COUNTRIES } from "../utils/countries";
import "../account.css";

function EditProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", username: "", email: "", country: "", bio: "" });
  const [originalEmail, setOriginalEmail] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    authApi.getProfile().then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        setFormData((p) => ({ ...p, fullName: `${d.firstName || ''} ${d.lastName || ''}`.trim(), username: d.username || '', email: d.email || '', country: d.country || '', bio: d.bio || '' }));
        setOriginalEmail(d.email || '');
      }
    }).catch(() => {
      const stored = localStorage.getItem("baseeraUserData");
      if (stored) { try { const p = JSON.parse(stored); setFormData((prev) => ({ ...prev, fullName: p.fullName || prev.fullName, username: p.username || prev.username, email: p.email || prev.email, country: p.country || prev.country, bio: p.bio || prev.bio })); setOriginalEmail(p.email || ''); } catch {} }
    });
  }, []);

  const handleChange = (e) => { const { name, value } = e.target; setFormData((p) => ({ ...p, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(""); setSaveSuccess("");
    const fullNameTrimmed = formData.fullName.trim(), usernameTrimmed = formData.username.trim(), emailTrimmed = formData.email.trim();
    if (!fullNameTrimmed) { setSaveError("Full name is required."); return; }
    const parts = fullNameTrimmed.split(/\s+/); const firstName = parts[0] || ''; const lastName = parts.slice(1).join(' ') || '';
    if (!firstName || !lastName) { setSaveError("Please enter both your first and last name."); return; }
    if (!usernameTrimmed) { setSaveError("Username is required."); return; }
    if (!emailTrimmed) { setSaveError("Email address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setSaveError("Please enter a valid email address."); return; }
    const countryTrimmed = formData.country.trim();
    if (!countryTrimmed) { setSaveError("Country is required."); return; }

    const emailChanged = emailTrimmed.toLowerCase() !== (originalEmail || '').toLowerCase();
    // Email is handled by the verified-change flow, not the profile update.
    const payload = { username: usernameTrimmed, firstName, lastName, country: countryTrimmed, bio: formData.bio || "" };
    try {
      const response = await authApi.updateProfile(payload);
      if (!response.success) { setSaveError(response.message || "Failed to update profile."); return; }

      localStorage.setItem("baseeraUserName", usernameTrimmed);
      try {
        const ud = JSON.parse(localStorage.getItem("baseeraUserData") || '{}');
        const next = { ...ud, username: usernameTrimmed, fullName: `${firstName} ${lastName}`.trim() };
        if (!emailChanged) next.email = emailTrimmed; // only store email if it did not change
        localStorage.setItem("baseeraUserData", JSON.stringify(next));
      } catch {}

      if (emailChanged) {
        try {
          await authApi.requestEmailChange(emailTrimmed);
          setSaveSuccess(`Profile saved. A confirmation link was sent to ${emailTrimmed}. Your email stays ${originalEmail} until you confirm it.`);
          setFormData((p) => ({ ...p, email: originalEmail })); // revert the field until confirmed
        } catch (e2) {
          setSaveError(e2.response?.data?.message || "Profile saved, but the email change could not be requested.");
        }
      } else {
        setSaveSuccess("Profile updated. Redirecting…");
        setTimeout(() => navigate('/profile'), 1200);
      }
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      if (backendMessage) { setSaveError(backendMessage); return; }
      try {
        const ud = JSON.parse(localStorage.getItem("baseeraUserData") || '{}');
        localStorage.setItem("baseeraUserData", JSON.stringify({ ...ud, fullName: `${firstName} ${lastName}`.trim(), username: usernameTrimmed, email: emailTrimmed, country: formData.country || "", bio: formData.bio || "" }));
        localStorage.setItem("baseeraUserName", usernameTrimmed);
      } catch {}
      setSaveError("Could not reach the server. Your changes were saved locally.");
    }
  };

  return (
    <DashboardLayout>
      <div className="acct-wrap">
        <div className="acct-head"><h1>Edit profile</h1><p>Update your personal details.</p></div>
        <div className="acct-card">
          {saveError && <div className="b-error">{saveError}</div>}
          {saveSuccess && <div className="b-success">{saveSuccess}</div>}
          <form onSubmit={handleSubmit}>
            <div className="b-row2">
              <div className="b-field">
                <label className="b-label">Full name</label>
                <div className="b-input-wrap"><i className="fa-solid fa-user ico-l"></i><input className="b-input has-l" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Mark Johnson" required /></div>
              </div>
              <div className="b-field">
                <label className="b-label">Username</label>
                <div className="b-input-wrap"><i className="fa-solid fa-at ico-l"></i><input className="b-input has-l" name="username" value={formData.username} onChange={handleChange} placeholder="markjohnson" required /></div>
              </div>
            </div>
            <div className="b-row2">
              <div className="b-field">
                <label className="b-label">Email address</label>
                <div className="b-input-wrap"><i className="fa-solid fa-envelope ico-l"></i><input className="b-input has-l" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required /></div>
                <div className="b-hint">Changing your email sends a confirmation link to the new address. Your current email stays until you confirm.</div>
              </div>
              <div className="b-field">
                <label className="b-label">Country</label>
                <div className="b-input-wrap"><i className="fa-solid fa-globe ico-l"></i>
                  <select className="b-input has-l" name="country" value={formData.country} onChange={handleChange} required>
                    <option value="" disabled>Select your country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="b-field">
              <label className="b-label">Short bio <span style={{ color: 'var(--t3)', textTransform: 'none' }}>(optional)</span></label>
              <textarea className="b-input" name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us a little about yourself…" maxLength={500} rows={4}></textarea>
              <div className="b-hint" style={{ textAlign: 'right' }}>{formData.bio.length} / 500</div>
            </div>
            <div className="acct-actions">
              <button type="submit" className="b-btn b-btn--primary"><i className="fa-solid fa-check"></i> Save changes</button>
              <button type="button" className="b-btn b-btn--ghost" onClick={() => navigate('/profile')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default EditProfile;
