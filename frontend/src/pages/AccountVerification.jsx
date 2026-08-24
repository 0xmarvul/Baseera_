import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { authApi } from "../api/authApi";

function AccountVerification() {
    const location = useLocation();
    const email = location.state?.email || "";
    const [resendStatus, setResendStatus] = useState("");
    const [resendLoading, setResendLoading] = useState(false);

    const handleResend = async () => {
        setResendStatus(""); setResendLoading(true);
        try { await authApi.resendVerification(email); setResendStatus("A new verification email has been sent. Check your inbox."); }
        catch { setResendStatus("Failed to resend. Please try again later."); }
        finally { setResendLoading(false); }
    };

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-badge"><i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 26, color: 'var(--accent)' }}></i></div>
                    <h1 className="auth-title">Verify your email</h1>
                    <p className="auth-sub">A verification link has been sent to your email. Check your inbox and verify your account to continue.</p>
                    {email && <p style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--t2)', marginBottom: 18 }}>Sent to <strong style={{ color: 'var(--accent)' }}>{email}</strong></p>}
                    {resendStatus && <div className={resendStatus.includes("Failed") ? "b-error" : "b-success"}>{resendStatus}</div>}
                    <button className="b-btn b-btn--ghost b-btn--block" onClick={handleResend} disabled={resendLoading}>{resendLoading ? "Sending…" : "Resend verification email"}</button>
                    <p className="auth-alt"><Link className="b-link" to="/login">Back to sign in</Link></p>
                </div>
            </section>
        </>
    );
}
export default AccountVerification;
