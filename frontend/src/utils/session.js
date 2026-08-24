// Centralised localStorage cleanup so logout, account-delete, login, and
// register can't drift apart. If you add a new per-user key, add it here
// once and every entry point picks it up.

// Per-user keys: anything that belongs to a logged-in identity. These get
// wiped on logout, on account delete, AND defensively on login/register so
// a shared browser doesn't leak the previous user's data to the next.
const USER_SCOPED_KEYS = [
  'authToken',
  'baseeraUserName',
  'baseeraUserData',
  'userAvatar',
  // Floating chat widget (BaseeraFloatingChat). Stores conversations +
  // panel open/closed state. Without clearing this, a new user inherits
  // the previous user's chat history on the same device.
  'baseera_widget_conversations',
  'baseera_widget_open',
  // Full-page AI chatbot (/ai-chatbot) conversations.
  'baseera_conversations',
];

export const clearUserSession = () => {
  for (const key of USER_SCOPED_KEYS) {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
  }
};

// Reads the role straight from the JWT (the source of truth the backend
// signs), so it is correct even if the cached profile predates a promotion.
export const getCurrentRole = () => {
  try {
    const t = localStorage.getItem('authToken');
    if (!t) return 'User';
    const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'User';
  } catch { return 'User'; }
};

export const isAdmin = () => getCurrentRole() === 'Admin';
