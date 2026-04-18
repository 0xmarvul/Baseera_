import React, { useState } from "react";
import "../index.css";
import "../login.css";
import "../forget.css";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { authApi } from "../api/authApi";

import icon7 from "../assets/lock.png";

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
        setError("");
        setSuccess("");

        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!email || !token) {
            setError("Invalid reset link. Please request a new one.");
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(email, token, newPassword);
            setSuccess("Password reset successfully!");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <section className="login-section">
                <div className="login-box">
                    <div className="login-icon">
                        <img src={icon7} alt="login icon" width={30} height={30} />
                    </div>
                    <div className="login">
                        <div className="login-title">
                            <h1 className="welcome">Reset Your Password</h1>
                            <p className="login-description">
                                Enter and confirm your new password below.
                            </p>
                        </div>
                        {error && <div className="form-error-msg">{error}</div>}
                        {success && <div className="form-success-msg">{success}</div>}
                        <form className="login-form" onSubmit={handleSubmit}>
                            <h5 className="login-form-title">New Password</h5>
                            <div className="forget-input-wrapper">
                                <i className="fa-solid fa-lock forget-input-icon"></i>
                                <input
                                    className="login-form-input"
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter your new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <h5 className="login-form-title">Confirm New Password</h5>
                            <div className="forget-input-wrapper">
                                <i className="fa-solid fa-lock forget-input-icon"></i>
                                <input
                                    className="login-form-input"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-forget-primary" disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                            <div className="forget-pass">
                                <Link className="link" to="/login">Back to Login</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

export default ResetPassword;
