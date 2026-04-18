import React, { useEffect, useState } from "react";
import '../navbar.css'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'

const LandingNavbar = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [displayName, setDisplayName] = useState("User");

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        const savedName = localStorage.getItem("baseeraUserName");
        if (savedName) {
            setDisplayName(savedName);
        }
    }, []);

  return (
  <>
<nav className="navbar navbar-expand-lg bg-body">
            <div className="container-fluid navbar-inner">
                <Link className="navbar-brand" to={isLoggedIn ? "/landing" : "/"}>
                    <img src={logo} alt="logo" />
                    <span className="navbar-brand-text">Baseera</span>
                </Link>
                
                {/* Toggler for mobile */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <Link className="nav-link" to={isLoggedIn ? "/landing" : "/"}>
                                Home
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/about">
                                About
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/contact">
                                Contact
                            </Link>
                        </li>
                        {isLoggedIn ? (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/bugs">
                                        Bugs
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/profile">
                                        Profile
                                    </Link>
                                </li>
                            </>
                        ) : (
                            <li className="nav-item">
                                <Link className="nav-link" to="/login">
                                    Login
                                </Link>
                            </li>
                        )}
                    </ul>
                    <div className="navbar-actions">
                        {isLoggedIn ? (
                            <div className="register-btn navbar-username">
                                Hello, {displayName}
                            </div>
                        ) : (
                            <Link to="/register" className="register-btn">
                                Register
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
  </>
  
  );
};

export default LandingNavbar;