import React, { useState, useEffect } from "react";
import LandingNavbar from "../components/LandingNavbar";
import "../profile.css";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

const PLACEHOLDER_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2390a1b9'%3E%3Cpath d='M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z'/%3E%3C/svg%3E";

function Profile() {
  const navigate = useNavigate();
  const [avatarImage, setAvatarImage] = useState(localStorage.getItem("userAvatar") || PLACEHOLDER_AVATAR);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "User",
    username: "@user",
    email: "",
    phone: "",
    country: "",
    accountCreated: "",
    bio: "",
    avatar: localStorage.getItem("userAvatar") || PLACEHOLDER_AVATAR,
  });

  // Close the avatar action menu when the user clicks outside it.
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const onClick = (e) => {
      if (!e.target.closest?.('.avatar-action-wrapper')) setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [avatarMenuOpen]);

  // Resets the avatar both in the UI and on the server. The Profile page
  // only ever stores avatars as data URLs (via canvas resize in
  // handleImageUpload), so 'delete' is just clearing the URL on both sides.
  const handleDeleteAvatar = () => {
    if (!window.confirm('Delete your profile picture?')) return;
    setAvatarMenuOpen(false);
    setAvatarImage(PLACEHOLDER_AVATAR);
    localStorage.removeItem('userAvatar');
    setUserData(prev => ({ ...prev, avatar: PLACEHOLDER_AVATAR }));
    authApi.updateProfile({ profileImageUrl: '' }).catch(() => {});
  };

  useEffect(() => {
    // Fetch profile from API
    authApi.getProfile()
      .then(res => {
        if (res.success && res.data) {
          const d = res.data;
          const apiAvatar = d.profileImageUrl || localStorage.getItem("userAvatar") || PLACEHOLDER_AVATAR;
          if (d.profileImageUrl) {
            localStorage.setItem("userAvatar", d.profileImageUrl);
          }
          setAvatarImage(apiAvatar);
          setUserData({
            name: `${d.firstName} ${d.lastName}`.trim() || "User",
            username: "@" + d.username,
            email: d.email,
            phone: d.phoneNumber || "",
            country: d.country || "",
            accountCreated: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "",
            bio: d.bio || "",
            avatar: apiAvatar,
          });
        }
      })
      .catch(() => {
        // Fallback to localStorage if API fails
        const storedAvatar = localStorage.getItem("userAvatar");
        if (storedAvatar) setAvatarImage(storedAvatar);
        const storedUserData = localStorage.getItem("baseeraUserData");
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            setUserData(prev => ({
              ...prev,
              name: `${parsed.fullName || ''} ${parsed.lastName || ''}`.trim() || prev.name,
              username: "@" + (parsed.username || "user"),
              email: parsed.email || prev.email,
              phone: parsed.phone || prev.phone,
            }));
          } catch {}
        }
      });
  }, []);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        // Resize to 150x150 max
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(objectUrl);

        setAvatarImage(compressedBase64);
        localStorage.setItem("userAvatar", compressedBase64);
        setUserData(prev => ({ ...prev, avatar: compressedBase64 }));
        authApi.updateProfile({ profileImageUrl: compressedBase64 }).catch(() => {});
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); };
      img.src = objectUrl;
    }
  };

  return (
    <>
      <LandingNavbar />
      
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <h1>User Profile</h1>
          <p>Manage your account settings and security</p>
        </div>

        {/* Profile Card */}
        <div className="profile-card">
          {/* Avatar Section with Gradient */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              <img 
                src={avatarImage} 
                alt={userData.name}
                className="profile-avatar"
              />
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={(e) => { setAvatarMenuOpen(false); handleImageUpload(e); }}
                style={{display: 'none'}}
              />
              <div className="avatar-action-wrapper">
                <button
                  type="button"
                  className="avatar-upload-btn"
                  title="Profile picture options"
                  onClick={() => setAvatarMenuOpen(v => !v)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4.16669V15.8334" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.16699 10H15.8337" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {avatarMenuOpen && (
                  <div className="avatar-action-menu">
                    <label htmlFor="avatar-upload" className="avatar-action-item">
                      <i className="fa-solid fa-camera" /> Change Profile Picture
                    </label>
                    <button
                      type="button"
                      className="avatar-action-item danger"
                      onClick={handleDeleteAvatar}
                      disabled={!localStorage.getItem('userAvatar')}
                    >
                      <i className="fa-solid fa-trash" /> Delete Profile Picture
                    </button>
                  </div>
                )}
              </div>
    
            </div>
          </div>

          {/* User Info */}
          <div className="profile-user-info">
            <h2 className="profile-name">{userData.name}</h2>
            <p className="profile-username">{userData.username}</p>
            {userData.bio && (
              <p className="profile-bio">
                {userData.bio}
              </p>
            )}
          </div>

          {/* Info Grid */}
          <div className="profile-info-grid">
            {/* Email */}
            <div className="profile-info-box">
              <div className="profile-info-icon email-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.33301 3.33331H16.6663C17.583 3.33331 18.333 4.08331 18.333 4.99998V15C18.333 15.9166 17.583 16.6666 16.6663 16.6666H3.33301C2.41634 16.6666 1.66634 15.9166 1.66634 15V4.99998C1.66634 4.08331 2.41634 3.33331 3.33301 3.33331Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.333 5L9.99967 10.8333L1.66634 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="profile-info-content">
                <p className="profile-info-label">Email Address</p>
                <p className="profile-info-value">{userData.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="profile-info-box">
              <div className="profile-info-icon phone-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.3082 14.0999V16.5999C18.3091 16.8245 18.2627 17.0467 18.172 17.2525C18.0813 17.4583 17.9482 17.6433 17.7812 17.7959C17.6141 17.9485 17.4168 18.0655 17.2017 18.1395C16.9865 18.2134 16.7582 18.2428 16.5315 18.2257C14.0064 17.9712 11.5782 17.108 9.44148 15.7082C7.45731 14.4288 5.77119 12.7427 4.49148 10.7582C3.08317 8.60397 2.21944 6.15596 1.97398 3.61157C1.95694 3.38568 1.98611 3.15829 2.05962 2.94382C2.13313 2.72936 2.24946 2.53261 2.40127 2.36572C2.55308 2.19883 2.73714 2.06561 2.94205 1.97455C3.14696 1.88348 3.36827 1.83642 3.59148 1.83657H6.09148C6.4792 1.83263 6.85478 1.9672 7.15134 2.21592C7.44791 2.46464 7.64624 2.81213 7.70815 3.19407C7.82434 3.95804 8.02679 4.70803 8.31148 5.42907C8.41771 5.70303 8.44076 6.00085 8.37791 6.28731C8.31505 6.57377 8.16889 6.83587 7.95815 7.04157L6.91148 8.08824C8.08783 10.1535 9.80283 11.8685 11.8682 13.0449L12.9148 11.9982C13.1205 11.7875 13.3826 11.6413 13.6691 11.5785C13.9555 11.5156 14.2534 11.5387 14.5273 11.6449C15.2484 11.9296 15.9984 12.132 16.7623 12.2482C17.1489 12.3107 17.5002 12.5124 17.7498 12.8139C17.9995 13.1154 18.1316 13.4972 18.1232 13.8882L18.3082 14.0999Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="profile-info-content">
                <p className="profile-info-label">Phone Number</p>
                <p className="profile-info-value">{userData.phone || "—"}</p>
              </div>
            </div>

            {/* Country */}
            <div className="profile-info-box">
              <div className="profile-info-icon country-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.5 10H17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 2.5C12.0711 4.71858 13.2145 7.30652 13.3333 10C13.2145 12.6935 12.0711 15.2814 10 17.5C7.92893 15.2814 6.78553 12.6935 6.66667 10C6.78553 7.30652 7.92893 4.71858 10 2.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="profile-info-content">
                <p className="profile-info-label">Country</p>
                <p className="profile-info-value">{userData.country || "—"}</p>
              </div>
            </div>

            {/* Account Created */}
            <div className="profile-info-box">
              <div className="profile-info-icon calendar-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.8333 3.33331H4.16667C3.24619 3.33331 2.5 4.0795 2.5 4.99998V16.6666C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6666V4.99998C17.5 4.0795 16.7538 3.33331 15.8333 3.33331Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.333 1.66669V5.00002" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.66699 1.66669V5.00002" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.5 8.33331H17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="profile-info-content">
                <p className="profile-info-label">Account Created</p>
                <p className="profile-info-value">{userData.accountCreated || "—"}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
          
            <button 
              className="profile-btn profile-btn-primary"
              onClick={() => navigate('/edit-profile')}
            >
                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 2.5H4.16667C3.72464 2.5 3.30072 2.67559 2.98816 2.98816C2.67559 3.30072 2.5 3.72464 2.5 4.16667V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5H15.8333C16.2754 17.5 16.6993 17.3244 17.0118 17.0118C17.3244 16.6993 17.5 16.2754 17.5 15.8333V10" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M15.3127 2.18744C15.6443 1.85592 16.0939 1.66968 16.5627 1.66968C17.0316 1.66968 17.4812 1.85592 17.8127 2.18744C18.1443 2.51897 18.3305 2.9686 18.3305 3.43744C18.3305 3.90629 18.1443 4.35592 17.8127 4.68744L10.3019 12.1991C10.104 12.3968 9.85958 12.5415 9.59107 12.6199L7.19691 13.3199C7.1252 13.3409 7.04919 13.3421 6.97683 13.3236C6.90447 13.305 6.83843 13.2674 6.78561 13.2146C6.7328 13.1618 6.69515 13.0957 6.67661 13.0234C6.65807 12.951 6.65933 12.875 6.68024 12.8033L7.38024 10.4091C7.45901 10.1408 7.60402 9.89666 7.80191 9.69911L15.3127 2.18744Z" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
              Edit Profile
            </button>

  
            <button
              className="profile-btn profile-btn-secondary"
              onClick={() => navigate('/change-password')}
            >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.9165 6.25004L14.8332 8.16671C14.9889 8.3194 15.1984 8.40492 15.4165 8.40492C15.6346 8.40492 15.8441 8.3194 15.9998 8.16671L17.7498 6.41671C17.9025 6.26093 17.9881 6.0515 17.9881 5.83337C17.9881 5.61525 17.9025 5.40581 17.7498 5.25004L15.8332 3.33337" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M17.5 1.66663L9.5 9.66663" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M6.24984 17.5C8.78114 17.5 10.8332 15.448 10.8332 12.9167C10.8332 10.3854 8.78114 8.33337 6.24984 8.33337C3.71853 8.33337 1.6665 10.3854 1.6665 12.9167C1.6665 15.448 3.71853 17.5 6.24984 17.5Z" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
              Change Password
            </button>

            <button
              className="profile-btn profile-btn-secondary"
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('baseeraUserName');
                localStorage.removeItem('baseeraUserData');
                localStorage.removeItem('userAvatar');
                // Notify extension about logout
                window.postMessage({ type: 'BASEERA_AUTH_LOGOUT' }, '*');
                navigate('/login');
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3335 14.1667L17.5002 10L13.3335 5.83337" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 10H7.5" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </button>

            <button
              className="profile-btn profile-btn-danger"
              onClick={() => navigate('/delete')}
            >
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.3335 9.16663V14.1666" stroke="#FF6467" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M11.6665 9.16663V14.1666" stroke="#FF6467" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M15.8332 5V16.6667C15.8332 17.1087 15.6576 17.5326 15.345 17.8452C15.0325 18.1577 14.6085 18.3333 14.1665 18.3333H5.83317C5.39114 18.3333 4.96722 18.1577 4.65466 17.8452C4.3421 17.5326 4.1665 17.1087 4.1665 16.6667V5" stroke="#FF6467" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M2.5 5H17.5" stroke="#FF6467" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M6.6665 4.99996V3.33329C6.6665 2.89127 6.8421 2.46734 7.15466 2.15478C7.46722 1.84222 7.89114 1.66663 8.33317 1.66663H11.6665C12.1085 1.66663 12.5325 1.84222 12.845 2.15478C13.1576 2.46734 13.3332 2.89127 13.3332 3.33329V4.99996" stroke="#FF6467" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Profile;