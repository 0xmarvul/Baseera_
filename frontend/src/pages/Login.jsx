import React, { useState } from "react";
import "../index.css";
import "../about.css";
import "../contact.css";
import "../login.css";
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import icon7 from "../assets/lock.png";
import Navbar from "../components/Navbar";

function Login(){
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

        if (!email || !password) {
            setError("Please fill all fields");
            setLoading(false);
            return;
        }

        if (!email.includes("@")) {
            setError("Invalid email address");
            setLoading(false);
            return;
        }

        let username = email.split("@")[0];

        try {
            const response = await authApi.login({ email, password });

            if (response.success) {

                // ✅ Save token
                const token = response.data;
                localStorage.setItem("authToken", token);

                // ✅ Fetch actual profile to get the real username
                try {
                    const profileRes = await authApi.getProfile();
                    if (profileRes.success && profileRes.data) {
                        username = profileRes.data.username || email.split("@")[0];
                        localStorage.setItem("baseeraUserName", username);
                        localStorage.setItem("baseeraUserData", JSON.stringify({
                            username: username,
                            email: profileRes.data.email,
                            fullName: `${profileRes.data.firstName || ''} ${profileRes.data.lastName || ''}`.trim() || username,
                        }));
                        if (profileRes.data.profileImageUrl) {
                            localStorage.setItem("userAvatar", profileRes.data.profileImageUrl);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch profile:", err);
                    // Fallback: use email prefix
                    localStorage.setItem("baseeraUserName", username);
                }

                // ✅ Send token to Chrome Extension
                // Notify extension about auth change
                // Method 1: Direct external messaging (most reliable)
                if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                        // Try to find the extension - the extension ID may vary
                        // Use postMessage as primary since extension ID is dynamic
                        window.postMessage({
                            type: 'BASEERA_AUTH_UPDATE',
                            token: response.data,
                            email: email
                        }, '*');
                    } catch (e) {
                        console.log("Extension notification via postMessage failed:", e);
                    }
                }

                // Method 2: postMessage for content script relay (backup)
                window.postMessage({ type: 'BASEERA_AUTH_UPDATE', token: response.data, email: email }, '*');

                setError("");
                // Delay navigation to allow content script to relay auth to extension
                setTimeout(() => {
                    navigate("/landing");
                }, 200);

            } else {
                setError(response.message || "Login failed");
            }

        } catch (error) {
            console.error("Login error:", error);
            const errMsg = error.response?.data?.message || "Invalid email or password";
            if (errMsg.toLowerCase().includes("verify your email")) {
                setError(
                    <>
                        {errMsg}{" "}
                        <Link className="link" to="/account-verification" state={{ email }}>
                            Resend verification email
                        </Link>
                    </>
                );
            } else {
                setError(errMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return(
        <>
           <Navbar/>
            <section className="login-section">
                <div className="login-box">
                <div className="login-icon">
                    <img src={icon7} alt="login icon" width={30} height={30} />
                </div>
                <div className="login">
                    <div className="login-title">
                        <h1 className="welcome">Welcome Back</h1>
                        <p className="login-description">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {error && (
                        <div className="form-error-msg">
                            {error}
                        </div>
                    )}

                <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
                    <h5 className="login-form-title">
                        Email Address
                    </h5>

                    <div className="login-input-wrapper">
                        <i className="fa-solid fa-envelope login-input-icon-left"></i>
                        <input
                            className="login-form-input"
                            type="email"
                            placeholder=" Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                            autoComplete="off"
                        />
                    </div>

                    <h5 className="login-form-title">
                        Password
                    </h5>

                    <div className="login-input-wrapper">
                        <i className="fa-solid fa-lock login-input-icon-left"></i>
                        <input
                            className="login-form-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            autoComplete="current-password"
                        />
                        <i
                            className="fa-solid fa-eye login-input-icon-right"
                            onClick={() => setShowPassword((prev) => !prev)}
                            role="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    setShowPassword((prev) => !prev);
                                }
                            }}
                        ></i>
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="forget">
                    <Link className="link" to="/forget">
                        Forget Password ?
                    </Link>
                </div>

                <div className="register">
                    <p className="register-p">Don't have an account? </p>
                    <Link className="link" to="/register">
                        Register Here.
                    </Link>
                </div>

                </div>
                </div>
            </section>
        </>
    );
}

export default Login;
