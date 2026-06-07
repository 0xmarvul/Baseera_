import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import "../EditProfile.css";
import { authApi } from "../api/authApi";
import { COUNTRIES } from "../utils/countries";

function EditProfile() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    country: "",
    bio: "",
  });

  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Load user data from API on mount
  useEffect(() => {
    authApi.getProfile()
      .then(res => {
        if (res.success && res.data) {
          const d = res.data;
          setFormData(prev => ({
            ...prev,
            fullName: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
            username: d.username || '',
            email: d.email || '',
            country: d.country || '',
            bio: d.bio || '',
          }));
        }
      })
      .catch(() => {
        // Fallback to localStorage
        const storedUserData = localStorage.getItem("baseeraUserData");
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            setFormData(prev => ({
              ...prev,
              fullName: `${parsed.fullName || ''} ${parsed.lastName || ''}`.trim() || prev.fullName,
              username: parsed.username || prev.username,
              email: parsed.email || prev.email,
              country: parsed.country || prev.country,
              bio: parsed.bio || prev.bio,
            }));
          } catch {
            // localStorage fallback parse failed — fields keep their defaults.
          }
        }
      });
  }, []);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    // ── Required fields: explicit JS validation with clear error messages ──
    const fullNameTrimmed = formData.fullName.trim();
    const usernameTrimmed = formData.username.trim();
    const emailTrimmed = formData.email.trim();

    if (!fullNameTrimmed) {
      setSaveError("Full name is required.");
      return;
    }
    const nameParts = fullNameTrimmed.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    if (!firstName || !lastName) {
      setSaveError("Please enter both your first and last name.");
      return;
    }
    if (!usernameTrimmed) {
      setSaveError("Username is required.");
      return;
    }
    if (!emailTrimmed) {
      setSaveError("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setSaveError("Please enter a valid email address.");
      return;
    }

    // Phone, gender, dateOfBirth were removed from the form. Backend keeps
    // the DTO columns nullable so old data isn't wiped server-side; we just
    // stop sending those fields. Country is the only optional field left.
    const payload = {
      username: usernameTrimmed,
      email: emailTrimmed,
      firstName,
      lastName,
      country: formData.country || "",
      bio: formData.bio || "",
    };

    try {
      const response = await authApi.updateProfile(payload);

      if (response.success) {
        setSaveSuccess("Profile updated successfully!");
        // Update localStorage with new username and email
        localStorage.setItem("baseeraUserName", usernameTrimmed);
        try {
          const userData = JSON.parse(localStorage.getItem("baseeraUserData") || '{}');
          localStorage.setItem("baseeraUserData", JSON.stringify({
            ...userData,
            username: usernameTrimmed,
            email: emailTrimmed,
            fullName: `${firstName} ${lastName}`.trim(),
          }));
        } catch (_) {
          localStorage.setItem("baseeraUserData", JSON.stringify({
            username: usernameTrimmed,
            email: emailTrimmed,
            fullName: `${firstName} ${lastName}`.trim(),
          }));
        }
        setTimeout(() => navigate('/profile'), 1200);
      } else {
        setSaveError(response.message || "Failed to update profile.");
      }
    } catch (err) {
      // Surface the backend error message (e.g. "Username is already taken")
      const backendMessage = err.response?.data?.message;
      if (backendMessage) {
        setSaveError(backendMessage);
        return;
      }

      // Network failure / backend down: write through to localStorage so the
      // UI is at least responsive. Optional fields use empty string to mirror
      // the "cleared" intent.
      try {
        const userData = JSON.parse(localStorage.getItem("baseeraUserData") || '{}');
        const updatedData = {
          ...userData,
          fullName: `${firstName} ${lastName}`.trim(),
          username: usernameTrimmed,
          email: emailTrimmed,
          country: formData.country || "",
          bio: formData.bio || "",
        };
        localStorage.setItem("baseeraUserData", JSON.stringify(updatedData));
        localStorage.setItem("baseeraUserName", usernameTrimmed);
      } catch (_) {}
      setSaveError("Could not reach the server. Your changes were saved locally.");
    }
  };

  return (
    <>
      <LandingNavbar />

      <div className="edit-profile-container">
        {/* Form */}
        <form className="edit-profile-form" onSubmit={handleSubmit}>
          {saveError && <div className="form-error-msg" style={{marginBottom: "16px"}}>{saveError}</div>}
          {saveSuccess && <div className="form-success-msg" style={{marginBottom: "16px"}}>{saveSuccess}</div>}

          {/* Personal Information */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon personal-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.6667 17.5V15.8333C16.6667 14.9493 16.3155 14.1014 15.6904 13.4763C15.0652 12.8512 14.2174 12.5 13.3333 12.5H6.66667C5.78261 12.5 4.93476 12.8512 4.30964 13.4763C3.68452 14.1014 3.33333 14.9493 3.33333 15.8333V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.99999 9.16667C11.8409 9.16667 13.3333 7.67428 13.3333 5.83333C13.3333 3.99238 11.8409 2.5 9.99999 2.5C8.15904 2.5 6.66666 3.99238 6.66666 5.83333C6.66666 7.67428 8.15904 9.16667 9.99999 9.16667Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Personal Information</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <div className="input-wrapper">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.3333 14V12.6667C13.3333 11.9594 13.0524 11.2811 12.5523 10.781C12.0522 10.281 11.3739 10 10.6667 10H5.33333C4.62609 10 3.94781 10.281 3.44772 10.781C2.94762 11.2811 2.66667 11.9594 2.66667 12.6667V14" stroke="#90A1B9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 7.33333C9.47276 7.33333 10.6667 6.13943 10.6667 4.66667C10.6667 3.19391 9.47276 2 8 2C6.52724 2 5.33333 3.19391 5.33333 4.66667C5.33333 6.13943 6.52724 7.33333 8 7.33333Z" stroke="#90A1B9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Username <span className="required">*</span></label>
                <div className="input-wrapper">
               <h5>@</h5>
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username"
                    required
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon contact-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.33301 3.33331H16.6663C17.583 3.33331 18.333 4.08331 18.333 4.99998V15C18.333 15.9166 17.583 16.6666 16.6663 16.6666H3.33301C2.41634 16.6666 1.66634 15.9166 1.66634 15V4.99998C1.66634 4.08331 2.41634 3.33331 3.33301 3.33331Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.333 5L9.99967 10.8333L1.66634 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Contact Information</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Email Address <span className="required">*</span></label>
                <div className="input-wrapper">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.66667 2.66669H13.3333C14 2.66669 14.6667 3.33335 14.6667 4.00002V12C14.6667 12.6667 14 13.3334 13.3333 13.3334H2.66667C2 13.3334 1.33333 12.6667 1.33333 12V4.00002C1.33333 3.33335 2 2.66669 2.66667 2.66669Z" stroke="#90A1B9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.6667 4L8 8.66667L1.33333 4" stroke="#90A1B9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon location-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.5 8.33333C17.5 14.1667 10 19.1667 10 19.1667C10 19.1667 2.5 14.1667 2.5 8.33333C2.5 6.34420 3.29018 4.43655 4.6967 3.03141C6.10322 1.62589 8.01088 0.833328 10 0.833328C11.9891 0.833328 13.8968 1.62589 15.3033 3.03141C16.7098 4.43655 17.5 6.34420 17.5 8.33333Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Location</h3>
            </div>

            <div className="form-group">
              <label>Country</label>
              <div className="input-wrapper">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6" stroke="#90A1B9" strokeWidth="1.33333"/>
                  <path d="M2 8H14" stroke="#90A1B9" strokeWidth="1.33333"/>
                  <path d="M8 2C9.5 3.5 10.5 5.5 10.5 8C10.5 10.5 9.5 12.5 8 14C6.5 12.5 5.5 10.5 5.5 8C5.5 5.5 6.5 3.5 8 2Z" stroke="#90A1B9" strokeWidth="1.33333"/>
                </svg>
                {/* Same fixed ISO 3166-1 list as Register so the country
                    string we store stays consistent across signup + edit. */}
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                >
                  <option value="" disabled>Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* About You */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon about-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 13.3333V10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 6.66667H10.0083" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>About You</h3>
            </div>

            <div className="form-group">
              <label>Short Bio <span className="optional">(Optional)</span></label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us a little about yourself..."
                maxLength={500}
                rows={5}
              ></textarea>
              <div className="char-count">{formData.bio.length} / 500</div>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Save Changes
          </button>
        </form>
      </div>
    </>
  );
}

export default EditProfile;