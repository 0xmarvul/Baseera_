import React, { useState } from "react";
import { Link } from 'react-router-dom';
import MarketingNav from "../components/MarketingNav";
import Logo from "../components/Logo";
import { authApi } from "../api/authApi";

function Forget() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const isLoggedIn = !!localStorage.getItem("authToken");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!email) { setError("Please enter your email address."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setSuccess("If an account with that email exists, a reset link has been sent.");
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card">
                    <div className="auth-badge"><Logo size={30} pupil="#0c1526" /></div>
                    <h1 className="auth-title">Forgot password?</h1>
                    <p className="auth-sub">Enter your email and we will send you a reset link</p>
                    {error && <div className="b-error">{error}</div>}
                    {success && <div className="b-success">{success}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="b-field">
                            <label className="b-label">Email address</label>
                            <div className="b-input-wrap"><i className="fa-solid fa-envelope ico-l"></i>
                                <input className="b-input has-l" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                        </div>
                        <button className="b-btn b-btn--primary b-btn--block b-btn--lg" type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
                    </form>
                    <p className="auth-alt"><Link className="b-link" to={isLoggedIn ? "/profile" : "/login"}>{isLoggedIn ? "Back to profile" : "Back to sign in"}</Link></p>
                </div>
            </section>
        </>
    );
}
export default Forget;
