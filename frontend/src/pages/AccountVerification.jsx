import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../index.css";
import "../register.css";
import Navbar from "../components/Navbar";
import { authApi } from "../api/authApi";
import icon1 from "../assets/logo.png";

function AccountVerification() {
    const location = useLocation();
    const email = location.state?.email || "";
    const [resendStatus, setResendStatus] = useState("");
    const [resendLoading, setResendLoading] = useState(false);

    const handleResend = async () => {
        setResendStatus("");
        setResendLoading(true);
        try {
            await authApi.resendVerification(email);
            setResendStatus("A new verification email has been sent. Please check your inbox.");
        } catch {
            setResendStatus("Failed to resend. Please try again later.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <section className="register-container">
                <div className="register-box">
                    <div className="logo-icon">
                        <img src={icon1} alt="login icon" width={30} height={30} />
                        <h2 className="logo-title">Baseera</h2>
                    </div>
                    <div className="register-info">
                        <div className="register-title">
                            <h1 className="create">Verify Your Email</h1>
                            <p className="register-description">
                                A verification link has been sent to your email address. Please check your inbox and verify your account to continue.
                            </p>
                            {email && (
                                <p style={{ color: "#64b5f6", marginTop: "8px", fontSize: "14px", textAlign: "center" }}>
                                    Sent to: <strong>{email}</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    {resendStatus && (
                        <div className={resendStatus.includes("Failed") ? "form-error-msg" : "form-success-msg"}>
                            {resendStatus}
                        </div>
                    )}

                    <div className="btn" style={{ marginTop: "16px" }}>
                        <button onClick={handleResend} disabled={resendLoading} style={{ color: "#00D492", background: "transparent", border: "1px solid #00D492", borderRadius: "8px", padding: "10px 24px", cursor: "pointer", fontSize: "16px", fontWeight: "600" }}>
                            {resendLoading ? "Sending..." : "Resend Verification Email"}
                        </button>
                    </div>

                    <div className="login-2" style={{ marginTop: "16px" }}>
                        <Link className="link" to="/login">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

export default AccountVerification;
