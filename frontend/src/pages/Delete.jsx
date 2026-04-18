import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Profile from "./Profile";
import "../delete.css";
import { authApi } from "../api/authApi";

function Delete() {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteForever = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await authApi.deleteAccount();
      localStorage.removeItem("authToken");
      localStorage.removeItem("baseeraUserName");
      localStorage.removeItem("baseeraUserData");
      localStorage.removeItem("userAvatar");
      navigate("/login");
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <Profile />

      <section className="delete-section">
        <div className="delete-modal">
          <div className="delete-modal-header">
            <div className="delete-alert-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 8V13"
                  stroke="#FF6467"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16.5H12.01"
                  stroke="#FF6467"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M10.29 3.86L2.82 16.24C2.47 16.84 2.79 17.6 3.48 17.6H20.52C21.21 17.6 21.53 16.84 21.18 16.24L13.71 3.86C13.36 3.27 12.64 3.27 12.29 3.86Z"
                  stroke="#FF6467"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="delete-title">Delete Account</h1>
              <p className="delete-subtitle">This action cannot be undone</p>
            </div>
          </div>

          <p className="delete-body">
            Are you sure you want to permanently delete your account? All your
            data, including scan history and settings, will be lost forever.
          </p>

          {deleteError && (
            <p style={{color: "#FF6467", fontSize: "14px", textAlign: "center", margin: "0 0 12px"}}>{deleteError}</p>
          )}

          <div className="delete-actions">
            <button
              className="delete-btn delete-btn-danger"
              type="button"
              onClick={handleDeleteForever}
              disabled={deleting}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 6H21"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M6.5 6L7.2 19.2C7.24627 20.0302 7.93826 20.6667 8.76923 20.6667H15.2308C16.0617 20.6667 16.7537 20.0302 16.8 19.2L17.5 6"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M10 10V17"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M14 10V17"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              {deleting ? "Deleting..." : "Delete Forever"}
            </button>
            <Link className="delete-btn delete-btn-secondary" to="/profile">
              Cancel
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default Delete;
