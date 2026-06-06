import React from "react";
import { Link } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import { Home, Bug, ArrowLeft } from "lucide-react";
import "../index.css";
import "../NotFound.css";

function NotFound() {
  const isLoggedIn = !!localStorage.getItem("authToken");

  return (
    <>
      <LandingNavbar />
      <section className="notfound-section">
        <div className="notfound-orb notfound-orb-left" aria-hidden="true" />
        <div className="notfound-orb notfound-orb-right" aria-hidden="true" />

        <div className="notfound-content">
          <p className="notfound-eyebrow">Error 404</p>
          <h1 className="notfound-code">404</h1>
          <h2 className="notfound-title">Page not found</h2>
          <p className="notfound-description">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Try one of the links below.
          </p>

          <div className="notfound-actions">
            <Link
              to={isLoggedIn ? "/landing" : "/"}
              className="notfound-btn notfound-btn-primary"
            >
              <Home size={18} strokeWidth={2.2} />
              <span>Go Home</span>
            </Link>

            {isLoggedIn && (
              <Link to="/bugs" className="notfound-btn notfound-btn-ghost">
                <Bug size={18} strokeWidth={2.2} />
                <span>Open Bugs Dashboard</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => window.history.back()}
              className="notfound-btn notfound-btn-ghost"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default NotFound;
