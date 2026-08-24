import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { authApi } from "../api/authApi";

function ConfirmEmailChange() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!token) { setStatus("error"); setMessage("This confirmation link is invalid."); return; }
      try {
        const res = await authApi.confirmEmailChange(token);
        setStatus("success");
        setMessage(res.message || "Your email has been updated. You can now sign in with your new address.");
        // Clear the cached email so Profile / Login re-fetch the fresh value.
        try {
          const ud = JSON.parse(localStorage.getItem("baseeraUserData") || '{}');
          delete ud.email; localStorage.setItem("baseeraUserData", JSON.stringify(ud));
        } catch {}
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "This confirmation link is invalid or has expired.");
      }
    };
    run();
  }, [token]);

  const ok = status === "success";
  const icon = status === "verifying"
    ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 26, color: 'var(--accent)' }}></i>
    : ok ? <i className="fa-solid fa-check" style={{ fontSize: 26, color: 'var(--accent)' }}></i>
      : <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 26, color: 'var(--high)' }}></i>;

  return (
    <>
      <MarketingNav />
      <section className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-badge">{icon}</div>
          <h1 className="auth-title">
            {status === "verifying" && "Confirming your email…"}
            {status === "success" && "Email updated"}
            {status === "error" && "Confirmation failed"}
          </h1>
          <p className="auth-sub">{message || "Please wait while we confirm your new email."}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="b-btn b-btn--primary" to="/profile">Go to profile</Link>
            <Link className="b-btn b-btn--ghost" to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default ConfirmEmailChange;
