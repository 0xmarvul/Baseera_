import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MarketingNav from "../components/MarketingNav";
import Logo from "../components/Logo";
import PasswordChecklist from "../components/PasswordChecklist";
import { authApi } from "../api/authApi";
import { isPasswordValid, PASSWORD_ERROR_MESSAGE } from "../utils/passwordPolicy";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!newPassword || !confirmPassword) { setError("Please fill in all fields."); return; }
        if (!isPasswordValid(newPassword)) { setError(PASSWORD_ERROR_MESSAGE); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        if (!email || !token) { setError("Invalid reset link. Please request a new one."); return; }
        setLoading(true);
        try {
            await authApi.resetPassword(email, token, newPassword);
            setSuccess("Password reset successfully. Redirecting to sign in…");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
        } finally { setLoading(false); }
    };

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card">
                    <div className="auth-badge"><Logo size={30} pupil="#0c1526" /></div>
                    <h1 className="auth-title">Reset your password</h1>
                    <p className="auth-sub">Enter and confirm your new password</p>
                    {error && <div className="b-error">{error}</div>}
                    {success && <div className="b-success">{success}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="b-field">
                            <label className="b-label">New password</label>
                            <div className="b-input-wrap"><i className="fa-solid fa-lock ico-l"></i>
                                <input className="b-input has-l" type="password" placeholder="Enter a new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" /></div>
                            <PasswordChecklist password={newPassword} />
                        </div>
                        <div className="b-field">
                            <label className="b-label">Confirm new password</label>
                            <div className="b-input-wrap"><i className="fa-solid fa-lock ico-l"></i>
                                <input className="b-input has-l" type="password" placeholder="Re-enter your new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" /></div>
                        </div>
                        <button className="b-btn b-btn--primary b-btn--block b-btn--lg" type="submit" disabled={loading}>{loading ? "Resetting…" : "Reset password"}</button>
                    </form>
                    <p className="auth-alt"><Link className="b-link" to="/login">Back to sign in</Link></p>
                </div>
            </section>
        </>
    );
}
export default ResetPassword;
