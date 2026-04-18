import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../index.css";
import "../register.css";
import Navbar from "../components/Navbar";
import { authApi } from "../api/authApi";
import icon1 from "../assets/logo.png";

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";

    const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "already-verified" | "error"
    const [message, setMessage] = useState("");
    const [resendStatus, setResendStatus] = useState("");
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        const verify = async () => {
            if (!email || !token) {
                setStatus("error");
                setMessage("Invalid verification link. Please request a new one.");
                return;
            }
            try {
                await authApi.verifyEmail({ email, token });
                setStatus("success");
                setMessage("Email verified successfully! Redirecting to login...");
                setTimeout(() => navigate("/login"), 3000);
            } catch (err) {
                const errMsg = err.response?.data?.message || "Invalid or expired verification link.";
                if (errMsg.toLowerCase().includes("already been verified")) {
                    setStatus("already-verified");
                    setMessage("This email has already been verified. You can proceed to login.");
                } else {
                    setStatus("error");
                    setMessage(errMsg);
                }
            }
        };
        verify();
    }, [email, token, navigate]);

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
                            <h1 className="create">
                                {status === "verifying" && "Verifying Email..."}
                                {status === "success" && "Email Verified!"}
                                {status === "already-verified" && "Email Already Verified"}
                                {status === "error" && "Verification Failed"}
                            </h1>
                            {status === "verifying" && (
                                <p className="register-description">Please wait while we verify your email.</p>
                            )}
                            {status === "success" && (
                                <p className="register-description" style={{ color: "#4caf50" }}>{message}</p>
                            )}
                            {status === "already-verified" && (
                                <p className="register-description" style={{ color: "#00D492" }}>{message}</p>
                            )}
                            {status === "error" && (
                                <p className="register-description" style={{ color: "#f44336" }}>{message}</p>
                            )}
                        </div>
                    </div>

                    {status === "error" && (
                        <>
                            {resendStatus && (
                                <div className={resendStatus.includes("Failed") ? "form-error-msg" : "form-success-msg"}>
                                    {resendStatus}
                                </div>
                            )}
                            <div className="btn" style={{ marginTop: "16px" }}>
                                <button onClick={handleResend} disabled={resendLoading}>
                                    {resendLoading ? "Sending..." : "Resend Verification Email"}
                                </button>
                            </div>
                        </>
                    )}

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

export default VerifyEmail;
