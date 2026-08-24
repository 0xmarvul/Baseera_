import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from '../api/authApi';
import MarketingNav from "../components/MarketingNav";
import Logo from "../components/Logo";
import PasswordChecklist from "../components/PasswordChecklist";
import { isPasswordValid, PASSWORD_ERROR_MESSAGE } from "../utils/passwordPolicy";
import { COUNTRIES } from "../utils/countries";
import { clearUserSession } from "../utils/session";

function Register() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const firstName = (formData.get("fullName") || "").toString().trim();
        const lastName = (formData.get("lastName") || "").toString().trim();
        const username = (formData.get("username") || "").toString().trim();
        const email = (formData.get("email") || "").toString().trim();
        const password = (formData.get("password") || "").toString().trim();
        const country = (formData.get("country") || "").toString().trim();

        setError(""); setSuccess(""); setLoading(true);

        if (!firstName || !lastName || !username || !email || !password || !country) { setError("Please fill all fields"); setLoading(false); return; }
        if (!email.includes("@")) { setError("Invalid email address"); setLoading(false); return; }
        if (!isPasswordValid(password)) { setError(PASSWORD_ERROR_MESSAGE); setLoading(false); return; }

        try {
            const response = await authApi.register({ email, username, firstName, lastName, password, country });
            if (response.success) {
                clearUserSession();
                setSuccess("Account created. Check your email to verify your account.");
                setTimeout(() => navigate("/account-verification", { state: { email } }), 1500);
            } else {
                setError(response.message || "Registration failed");
            }
        } catch (error) {
            console.error("Registration error:", error);
            setError(error.response?.data?.message || "Error creating account. Please try again");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <MarketingNav />
            <section className="auth-wrap">
                <div className="auth-card wide">
                    <div className="auth-badge"><Logo size={30} pupil="#0c1526" /></div>
                    <h1 className="auth-title">Create your account</h1>
                    <p className="auth-sub">Join Baseera to track and fix what you find</p>

                    {error && <div className="b-error">{error}</div>}
                    {success && <div className="b-success">{success}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="b-row2">
                            <div className="b-field">
                                <label className="b-label">First name</label>
                                <div className="b-input-wrap"><i className="fa-solid fa-user ico-l"></i>
                                    <input className="b-input has-l" name="fullName" type="text" placeholder="Mark" disabled={loading} required autoComplete="given-name" /></div>
                            </div>
                            <div className="b-field">
                                <label className="b-label">Last name</label>
                                <div className="b-input-wrap"><i className="fa-solid fa-user ico-l"></i>
                                    <input className="b-input has-l" name="lastName" type="text" placeholder="Johnson" disabled={loading} required autoComplete="family-name" /></div>
                            </div>
                        </div>

                        <div className="b-row2">
                            <div className="b-field">
                                <label className="b-label">Email address</label>
                                <div className="b-input-wrap"><i className="fa-solid fa-envelope ico-l"></i>
                                    <input className="b-input has-l" name="email" type="email" placeholder="you@example.com" disabled={loading} required autoComplete="email username" /></div>
                            </div>
                            <div className="b-field">
                                <label className="b-label">Username</label>
                                <div className="b-input-wrap"><i className="fa-solid fa-at ico-l"></i>
                                    <input className="b-input has-l" name="username" type="text" placeholder="markjohnson" disabled={loading} required autoComplete="nickname" /></div>
                            </div>
                        </div>

                        <div className="b-field">
                            <label className="b-label">Password</label>
                            <div className="b-input-wrap"><i className="fa-solid fa-lock ico-l"></i>
                                <input className="b-input has-l has-r" name="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password"
                                    disabled={loading} value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} required autoComplete="new-password" />
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} ico-r`} role="button" tabIndex={0}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((p) => !p)}
                                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setShowPassword((p) => !p); } }}></i>
                            </div>
                            <PasswordChecklist password={passwordValue} />
                        </div>

                        <div className="b-field">
                            <label className="b-label">Country</label>
                            <div className="b-input-wrap"><i className="fa-solid fa-globe ico-l"></i>
                                <select className="b-input has-l" name="country" disabled={loading} required defaultValue="">
                                    <option value="" disabled>Select your country</option>
                                    {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                                </select>
                            </div>
                        </div>

                        <button className="b-btn b-btn--primary b-btn--block b-btn--lg" type="submit" disabled={loading}>
                            {loading ? "Creating account…" : "Create account"}
                        </button>
                    </form>

                    <p className="auth-alt">Already have an account? <Link className="b-link" to="/login">Sign in</Link></p>
                </div>
            </section>
        </>
    );
}
export default Register;
