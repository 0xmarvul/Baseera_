import React, { useState } from "react";
import "../index.css";
import "../login.css";
import "../forget.css";
import { Link, useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { authApi } from "../api/authApi";

import icon7 from "../assets/lock.png";

function Forget() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem("authToken");

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setSuccess("If an account with that email exists, a reset link has been sent.");
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
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
                            <h1 className="welcome">Forgot Password?</h1>
                            <p className="login-description">
                                Enter your registered email address and we&apos;ll send you a reset link.
                            </p>
                        </div>
                        {error && <div className="form-error-msg">{error}</div>}
                        {success && <div className="form-success-msg">{success}</div>}
                        <form className="login-form" onSubmit={handleEmailSubmit}>
                            <h5 className="login-form-title">Email Address</h5>
                            <div className="forget-input-wrapper">
                                <i className="fa-solid fa-envelope forget-input-icon"></i>
                                <input
                                    className="login-form-input"
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-forget-primary" disabled={loading}>
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                            <div className="forget-pass">
                                <Link className="link" to={isLoggedIn ? "/profile" : "/Login"}>
                                    {isLoggedIn ? "Back to Profile" : "Back to Login"}
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Forget;

