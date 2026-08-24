import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import MarketingNav from "../components/MarketingNav";
import Logo from "../components/Logo";
import { clearUserSession } from "../utils/session";

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!email || !password) { setError("Please fill all fields"); setLoading(false); return; }
        if (!email.includes("@")) { setError("Invalid email address"); setLoading(false); return; }

        let username = email.split("@")[0];

        try {
            const response = await authApi.login({ email, password });
            if (response.success) {
                clearUserSession();
                const token = response.data;
                localStorage.setItem("authToken", token);

                try {
                    const profileRes = await authApi.getProfile();
                    if (profileRes.success && profileRes.data) {
                        username = profileRes.data.username || email.split("@")[0];
                        localStorage.setItem("baseeraUserName", username);
                        localStorage.setItem("baseeraUserData", JSON.stringify({
                            username,
                            email: profileRes.data.email,
                            fullName: `${profileRes.data.firstName || ''} ${profileRes.data.lastName || ''}`.trim() || username,
                        }));
                        if (profileRes.data.profileImageUrl) {
                            localStorage.setItem("userAvatar", profileRes.data.profileImageUrl);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch profile:", err);
                    localStorage.setItem("baseeraUserName", username);
                }

                // Relay auth to the Chrome extension (best-effort).
                window.postMessage({ type: 'BASEERA_AUTH_UPDATE', token: response.data, email }, '*');

                setError("");
                setTimeout(() => navigate("/landing"), 200);
            } else {
                setError(response.message || "Login failed");
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.response?.status === 429) {
                const retryAfter = parseInt(error.response.headers?.["retry-after"] || "60", 10);
                setError(`Too many login attempts. Try again in ${retryAfter}s.`);
                setLoading(false);
                return;
            }
            const errMsg = error.response?.data?.message || "Invalid email or password";
            if (errMsg.toLowerCase().includes("verify your email")) {
                setError(
                    <>
                        {errMsg}{" "}
                        <Link className="b-link" to="/account-verification" state={{ email }}>Resend verification email</Link>
                    </>
                );
            } else {
                setError(errMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card">
                    <div className="auth-badge"><Logo size={30} pupil="#0c1526" /></div>
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-sub">Sign in to your Baseera account to continue</p>

                    {error && <div className="b-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="b-field">
                            <label className="b-label">Email address</label>
                            <div className="b-input-wrap">
                                <i className="fa-solid fa-envelope ico-l"></i>
                                <input className="b-input has-l" type="email" placeholder="you@example.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required autoComplete="email username" />
                            </div>
                        </div>

                        <div className="b-field">
                            <label className="b-label">Password</label>
                            <div className="b-input-wrap">
                                <i className="fa-solid fa-lock ico-l"></i>
                                <input className="b-input has-l has-r" type={showPassword ? "text" : "password"} placeholder="Your password"
                                    value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required autoComplete="current-password" />
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} ico-r`}
                                    onClick={() => setShowPassword((p) => !p)} role="button" tabIndex={0}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") setShowPassword((p) => !p); }}></i>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', marginBottom: '18px' }}>
                            <Link className="b-link" to="/forget" style={{ fontSize: '13px' }}>Forgot password?</Link>
                        </div>

                        <button className="b-btn b-btn--primary b-btn--block b-btn--lg" type="submit" disabled={loading}>
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>

                    <p className="auth-alt">Don't have an account? <Link className="b-link" to="/register">Create one</Link></p>
                </div>
            </section>
        </>
    );
}

export default Login;
