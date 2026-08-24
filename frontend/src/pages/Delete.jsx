import React, { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { authApi } from "../api/authApi";
import { clearUserSession } from "../utils/session";
import "../account.css";

function Delete() {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteForever = async () => {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    setDeleting(true); setDeleteError("");
    try {
      await authApi.deleteAccount();
      clearUserSession();
      window.location.href = "/login";
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="acct-wrap">
        <div className="acct-head"><h1>Delete account</h1><p>Permanently remove your account and all its data.</p></div>
        <div className="acct-card danger">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,92,107,.1)', border: '1px solid rgba(255,92,107,.28)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--crit)' }}></i>
            </div>
            <div>
              <h2 style={{ color: 'var(--crit)' }}>This action cannot be undone</h2>
              <p className="cardsub" style={{ margin: 0 }}>All your data, including scan history, findings, and settings, will be lost forever.</p>
            </div>
          </div>
          {deleteError && <div className="b-error">{deleteError}</div>}
          <div className="acct-actions">
            <button className="b-btn" style={{ background: 'var(--crit)', color: '#fff' }} onClick={handleDeleteForever} disabled={deleting}>
              <i className="fa-solid fa-trash"></i> {deleting ? "Deleting…" : "Delete forever"}
            </button>
            <Link to="/profile" className="b-btn b-btn--ghost">Cancel</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default Delete;
