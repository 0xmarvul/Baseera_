import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { authApi } from "../api/authApi";

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");
    const [resendStatus, setResendStatus] = useState("");
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        const verify = async () => {
            if (!email || !token) { setStatus("error"); setMessage("Invalid verification link. Please request a new one."); return; }
            try {
                await authApi.verifyEmail({ email, token });
                setStatus("success"); setMessage("Email verified. Redirecting to sign in…");
                setTimeout(() => navigate("/login"), 3000);
            } catch (err) {
                const errMsg = err.response?.data?.message || "Invalid or expired verification link.";
                if (errMsg.toLowerCase().includes("already been verified")) { setStatus("already-verified"); setMessage("This email has already been verified. You can proceed to sign in."); }
                else { setStatus("error"); setMessage(errMsg); }
            }
        };
        verify();
    }, [email, token, navigate]);

    const handleResend = async () => {
        setResendStatus(""); setResendLoading(true);
        try { await authApi.resendVerification(email); setResendStatus("A new verification email has been sent. Check your inbox."); }
        catch { setResendStatus("Failed to resend. Please try again later."); }
        finally { setResendLoading(false); }
    };

    const ok = status === "success" || status === "already-verified";
    const icon = status === "verifying"
        ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 26, color: 'var(--accent)' }}></i>
        : ok ? <i className="fa-solid fa-check" style={{ fontSize: 26, color: 'var(--accent)' }}></i>
            : <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 26, color: 'var(--high)' }}></i>;

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-badge">{icon}</div>
                    <h1 className="auth-title">
                        {status === "verifying" && "Verifying email…"}
                        {status === "success" && "Email verified"}
                        {status === "already-verified" && "Already verified"}
                        {status === "error" && "Verification failed"}
                    </h1>
                    <p className="auth-sub">{message || "Please wait while we verify your email."}</p>
                    {status === "error" && (
                        <>
                            {resendStatus && <div className={resendStatus.includes("Failed") ? "b-error" : "b-success"}>{resendStatus}</div>}
                            <button className="b-btn b-btn--ghost b-btn--block" onClick={handleResend} disabled={resendLoading}>{resendLoading ? "Sending…" : "Resend verification email"}</button>
                        </>
                    )}
                    <p className="auth-alt"><Link className="b-link" to="/login">Back to sign in</Link></p>
                </div>
            </section>
        </>
    );
}
export default VerifyEmail;
