import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import PasswordChecklist from "../components/PasswordChecklist";
import { authApi } from "../api/authApi";
import { isPasswordValid, PASSWORD_ERROR_MESSAGE } from "../utils/passwordPolicy";
import "../account.css";

function PwField({ label, value, onChange, show, setShow, autoComplete }) {
  return (
    <div className="b-field">
      <label className="b-label">{label}</label>
      <div className="b-input-wrap">
        <i className="fa-solid fa-lock ico-l"></i>
        <input className="b-input has-l has-r" type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={label} />
        <button type="button" className="pw-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide" : "Show"}><i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i></button>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) { setError("Please fill in all fields"); return; }
    if (!isPasswordValid(newPassword)) { setError(PASSWORD_ERROR_MESSAGE); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess("Password changed successfully. Redirecting…");
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div className="acct-wrap">
        <div className="acct-head"><h1>Change password</h1><p>Update the password you use to sign in.</p></div>
        <div className="acct-card">
          {error && <div className="b-error">{error}</div>}
          {success && <div className="b-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <PwField label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} show={showCurrent} setShow={setShowCurrent} autoComplete="current-password" />
            <PwField label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} show={showNew} setShow={setShowNew} autoComplete="new-password" />
            <PasswordChecklist password={newPassword} />
            <PwField label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirm} setShow={setShowConfirm} autoComplete="new-password" />
            <div className="acct-actions">
              <button type="submit" className="b-btn b-btn--primary">Save new password</button>
              <Link to="/profile" className="b-btn b-btn--ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default ChangePassword;
