import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { clearUserSession } from "../utils/session";
import "../index.css";
import "../login.css";

function ExtensionSettings() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsLoggedIn(!!token);
    if (token) {
      const userData = localStorage.getItem("baseeraUserData");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          setEmail(parsed.email || "");
        } catch {
          setEmail("");
        }
      }
    }
  }, []);

  const handleLogout = () => {
    // Use the shared session clear so chat history + every per-user key
    // gets wiped, matching the rest of the app. The old hand-rolled
    // removeItem list was missing baseera_widget_conversations,
    // baseera_widget_open, and baseera_conversations - which leaked
    // chat history to the next user on a shared browser.
    clearUserSession();
    window.postMessage({ type: "BASEERA_AUTH_LOGOUT" }, "*");
    // Full reload (not SPA navigation) so app-level components like the
    // floating chat widget reinitialise from a clean localStorage.
    window.location.href = "/login";
  };

  return (
    <>
      <Navbar />
      <section className="login-section">
        <div className="login-box">
          <div className="login">
            <div className="login-title">
              <h1 className="welcome">Extension Settings</h1>
              <p className="login-description">
                Manage your Baseera extension authentication
              </p>
            </div>

            {isLoggedIn ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ color: "#90A1B9", marginBottom: "24px", fontSize: "15px" }}>
                  You are currently logged in as{" "}
                  <strong style={{ color: "#00BC7D" }}>{email}</strong>.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button
                    onClick={() => navigate("/profile")}
                    style={{
                      padding: "10px 20px",
                      background: "rgba(0,188,125,0.1)",
                      color: "#00BC7D",
                      border: "1px solid rgba(0,188,125,0.3)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      fontFamily: "inherit",
                    }}
                  >
                    Manage Account
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "10px 20px",
                      background: "rgba(255,100,103,0.1)",
                      color: "#FF6467",
                      border: "1px solid rgba(255,100,103,0.3)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      fontFamily: "inherit",
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ color: "#90A1B9", marginBottom: "24px", fontSize: "15px" }}>
                  You are not logged in.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    padding: "10px 20px",
                    background: "rgba(0,188,125,0.1)",
                    color: "#00BC7D",
                    border: "1px solid rgba(0,188,125,0.3)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    fontFamily: "inherit",
                  }}
                >
                  Log In
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default ExtensionSettings;
