import React, { useState } from "react";
import "../index.css";
import "../components/Navbar"
import "../about.css";
import "../contact.css";
import "../register.css";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from '../api/authApi';
import Navbar from "../components/Navbar";
import PasswordChecklist from "../components/PasswordChecklist";
import { isPasswordValid, PASSWORD_ERROR_MESSAGE } from "../utils/passwordPolicy";
import { COUNTRIES } from "../utils/countries";



import icon1 from "../assets/logo.png";



function Register(){
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

        setError("");
        setSuccess("");
        setLoading(true);

        if (!firstName || !lastName || !username || !email || !password || !country) {
            setError("Please fill all fields");
            setLoading(false);
            return;
        }

        if (!email.includes("@")) {
            setError("Invalid email address");
            setLoading(false);
            return;
        }

        if (!isPasswordValid(password)) {
            setError(PASSWORD_ERROR_MESSAGE);
            setLoading(false);
            return;
        }

        try {
            const response = await authApi.register({
                email,
                username,
                firstName,
                lastName,
                password,
                country
            });

            if (response.success) {
                setSuccess("Account created successfully! Please check your email to verify your account.");
                setTimeout(() => {
                    navigate("/account-verification", { state: { email } });
                }, 1500);
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

    return(
        <>
           <Navbar/>
        <section className="register-container">
            <div className="register-box">
          <div className="logo-icon">
                                <img src={icon1} alt="login icon" width={30} height={30} />
                                <h2 className="logo-title">Baseera</h2>
            </div>
              <div className="register-info">
                    <div className="register-title">
                        <h1 className="create">Create Your Account</h1>
                        <p className="register-description">
                            Join Baseera to secure your digital presence
                        </p>
                </div>
                </div>
                    {error && <div className="form-error-msg">{error}</div>}
                    {success && <div className="form-success-msg">{success}</div>}
                <form className="register-form" onSubmit={handleSubmit}>
                    {/* Row 1: First / Last name */}
                    <div className="register-form-row">
                        <div className="register-form-col">
                            <h5 className="register-form-title">First Name</h5>
                            <div className="register-input-wrapper">
                                <i className="fa-solid fa-user register-input-icon"></i>
                                <input className="register-form-input" name="fullName" type="text" placeholder="Mark" disabled={loading} required autoComplete="given-name" />
                            </div>
                        </div>
                        <div className="register-form-col">
                            <h5 className="register-form-title">Last Name</h5>
                            <div className="register-input-wrapper">
                                <i className="fa-solid fa-user register-input-icon"></i>
                                <input className="register-form-input" name="lastName" type="text" placeholder="Johnson" disabled={loading} required autoComplete="family-name" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Email / Username */}
                    <div className="register-form-row">
                        <div className="register-form-col">
                            <h5 className="register-form-title">Email Address</h5>
                            <div className="register-input-wrapper">
                                <i className="fa-solid fa-envelope register-input-icon"></i>
                                <input className="register-form-input" name="email" type="email" placeholder="Mark.johnson@baseera.security" disabled={loading} required autoComplete="email" />
                            </div>
                        </div>
                        <div className="register-form-col">
                            <h5 className="register-form-title">Username</h5>
                            <div className="register-input-wrapper">
                                <i className="fa-solid fa-at register-input-icon"></i>
                                <input className="register-form-input" name="username" type="text" placeholder="Markjohnson" disabled={loading} required autoComplete="off" />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Country / spacer. Country uses a fixed select list so
                        we capture clean ISO-style names instead of free-text typos. */}
                    <div className="register-form-row">
                        <div className="register-form-col">
                            <h5 className="register-form-title">Country</h5>
                            <div className="register-input-wrapper">
                                <i className="fa-solid fa-globe register-input-icon"></i>
                                <select className="register-form-input" name="country" disabled={loading} required defaultValue="">
                                    <option value="" disabled>Select your country</option>
                                    {COUNTRIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="register-form-col" aria-hidden="true" />
                    </div>

                    {/* Row 4: Password (full width so the policy checklist below has room) */}
                    <h5 className="register-form-title">Password</h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-lock register-input-icon"></i>
                        <input
                            className="register-form-input has-right-icon"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder=" ********"
                            disabled={loading}
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        <i
                            className={showPassword ? "fa-solid fa-eye-slash register-input-icon-right" : "fa-solid fa-eye register-input-icon-right"}
                            onClick={() => setShowPassword((prev) => !prev)}
                            role="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setShowPassword((prev) => !prev);
                                }
                            }}
                        ></i>
                    </div>
                    <PasswordChecklist password={passwordValue} />

                            <div className="btn">
                                <button type="submit" disabled={loading}>
                                    {loading ? "Creating Account..." : "Create Account"}
                                </button>
                                </div>

                    </form>
                    <div className="login-2">
                        <p className="login-p"> Already have an account?</p>
                        <Link className="link" to="/Login">
                    Login Here.
                    </Link>
                    </div>
        </div>
        
    </section>
    
        </>            
    );

}
export default Register;

