import React, { useState } from "react";
import "../index.css";
import "../components/Navbar"
import "../about.css";
import "../contact.css";
import "../register.css";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from '../api/authApi';
import Navbar from "../components/Navbar";



import icon1 from "../assets/logo.png";



function Register(){
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Date of birth constraints
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const firstName = (formData.get("fullName") || "").toString().trim();
        const lastName = (formData.get("lastName") || "").toString().trim();
        const username = (formData.get("username") || "").toString().trim();
        const email = (formData.get("email") || "").toString().trim();
        const password = (formData.get("password") || "").toString().trim();
        const phoneNumber = (formData.get("phoneNumber") || "").toString().trim() || null;
        const gender = (formData.get("gender") || "").toString().trim() || null;
        const dateOfBirth = (formData.get("dateOfBirth") || "").toString().trim() || null;
        const country = (formData.get("country") || "").toString().trim() || null;

        setError("");
        setSuccess("");
        setLoading(true);

        if (!firstName || !lastName || !username || !email || !password) {
            setError("Please fill all fields");
            setLoading(false);
            return;
        }

        if (!email.includes("@")) {
            setError("Invalid email address");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            const ageDiff = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const dayDiff = today.getDate() - dob.getDate();
            let age = ageDiff;
            if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

            if (dob > today) {
                setError("Date of birth cannot be in the future");
                setLoading(false);
                return;
            }
            if (age < 15) {
                setError("You must be at least 15 years old to register");
                setLoading(false);
                return;
            }
            if (age > 120) {
                setError("Please enter a valid date of birth");
                setLoading(false);
                return;
            }
        }

        try {
            const response = await authApi.register({
                email,
                username,
                firstName,
                lastName,
                password,
                phoneNumber,
                gender,
                dateOfBirth,
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
                    <h5 className="register-form-title">
                        First Name
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-user register-input-icon"></i>
                        <input className="register-form-input" name="fullName" type="text" placeholder="Mark " disabled={loading} required />
                    </div>
                    <h5 className="register-form-title">
                        Last Name
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-user register-input-icon"></i>
                        <input className="register-form-input" name="lastName" type="text" placeholder="Johnson" disabled={loading} required />
                    </div>
                    <h5 className="register-form-title">
                        Username
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-at register-input-icon"></i>
                        <input className="register-form-input" name="username" type="text" placeholder=" Markjohnson" disabled={loading} required />
                    </div>
                    <h5 className="register-form-title">
                        Email Address
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-envelope register-input-icon"></i>
                        <input className="register-form-input" name="email" type="email" placeholder=" Mark.johnson@baseera.security" disabled={loading} required />
                    </div>
                    <h5 className="register-form-title">
                        Password
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-lock register-input-icon"></i>
                        <input className="register-form-input has-right-icon" name="password" type={showPassword ? "text" : "password"} placeholder=" ********" disabled={loading} required />
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
                    
                    <h5 className="register-form-title">
                        Phone Number <span style={{fontWeight: 'normal', fontSize: '12px'}}>(Optional)</span>
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-phone register-input-icon"></i>
                        <input className="register-form-input" name="phoneNumber" type="tel" placeholder="+1 (555) 000-0000" disabled={loading} />
                    </div>
                    
                    <h5 className="register-form-title">
                        Gender <span style={{fontWeight: 'normal', fontSize: '12px'}}>(Optional)</span>
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-venus-mars register-input-icon"></i>
                        <select className="register-form-input" name="gender" disabled={loading}>
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    
                    <h5 className="register-form-title">
                        Date of Birth <span style={{fontWeight: 'normal', fontSize: '12px'}}>(Optional)</span>
                    </h5>
                    <div className="register-input-wrapper">
                        <input 
                            className="register-form-input" 
                            name="dateOfBirth" 
                            type="date" 
                            disabled={loading}
                            max={maxDate}
                            min={minDate}
                        />
                    </div>
                    
                    <h5 className="register-form-title">
                        Country <span style={{fontWeight: 'normal', fontSize: '12px'}}>(Optional)</span>
                    </h5>
                    <div className="register-input-wrapper">
                        <i className="fa-solid fa-globe register-input-icon"></i>
                        <input className="register-form-input" name="country" type="text" placeholder="Your country" disabled={loading} />
                    </div>
                    
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

