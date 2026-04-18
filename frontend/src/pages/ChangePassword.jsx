import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import { authApi } from "../api/authApi";
import "../change-password.css";

function ChangePassword() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            await authApi.changePassword(newPassword);
            setSuccess("Password changed successfully!");
            setTimeout(() => navigate("/profile"), 1500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to change password. Please try again.");
        }
    };

    return (
        <>
            <LandingNavbar />
            <section className="change-password-section">
                <div className="change-password-box">
                    <div className="change-password-icon">
                        <i className="fa-solid fa-lock" style={{ color: "#ffffff", fontSize: "28px" }}></i>
                    </div>
                    <div className="change-password-title">
                        <h1>Reset Your Password</h1>
                        <p>Enter and confirm your new password below.</p>
                    </div>
                    {error && <div className="change-password-error">{error}</div>}
                    {success && <div className="change-password-success">{success}</div>}
                    <form className="change-password-form" onSubmit={handleSubmit}>
                        <h5 className="change-password-form-title">New Password</h5>
                        <div className="change-password-input-wrapper">
                            <i className="fa-solid fa-lock change-password-input-icon"></i>
                            <input
                                className="change-password-input"
                                type={showNew ? "text" : "password"}
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="change-password-toggle-icon"
                                onClick={() => setShowNew((v) => !v)}
                                aria-label={showNew ? "Hide password" : "Show password"}
                            >
                                <i className={showNew ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                            </button>
                        </div>
                        <p className="change-password-helper-text">Must be at least 8 characters long</p>
                        <h5 className="change-password-form-title">Confirm New Password</h5>
                        <div className="change-password-input-wrapper">
                            <i className="fa-solid fa-lock change-password-input-icon"></i>
                            <input
                                className="change-password-input"
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="change-password-toggle-icon"
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label={showConfirm ? "Hide password" : "Show password"}
                            >
                                <i className={showConfirm ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                            </button>
                        </div>
                        <button type="submit" className="btn-change-password-primary">
                            Save New Password
                        </button>
                        <div className="change-password-back">
                            <Link className="change-password-back-link" to="/profile">
                                Back to Profile
                            </Link>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}

export default ChangePassword;
