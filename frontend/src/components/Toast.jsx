import React, { useEffect, useState } from 'react';
import './Toast.css';

// Lightweight toast system. No third-party deps.
// Usage from anywhere in the app:
//   import { showToast } from '../components/Toast';
//   showToast('Scan deleted');                      // default = success
//   showToast('Failed to delete', { type: 'error' });
//   showToast('Saved', { type: 'success', duration: 2000 });
//
// One <ToastHost /> is mounted at App level. Calls to showToast()
// dispatch a window event that ToastHost listens for, so any page
// (or non-React code) can fire a toast without prop-drilling a context.

const EVENT_NAME = 'baseera-toast';

export const showToast = (message, opts = {}) => {
  if (!message) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: {
      message,
      type: opts.type || 'success',
      duration: typeof opts.duration === 'number' ? opts.duration : 2800,
    },
  }));
};

export function ToastHost() {
  // Stack of currently visible toasts. New toasts append to the end and
  // self-remove via setTimeout. Limited to 3 visible at once so a burst
  // of errors doesn't fill the screen.
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onShow = (e) => {
      const id = Math.random().toString(36).slice(2, 9);
      const { message, type, duration } = e.detail;
      setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);
      // Self-dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };
    window.addEventListener(EVENT_NAME, onShow);
    return () => window.removeEventListener(EVENT_NAME, onShow);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="baseera-toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`baseera-toast baseera-toast-${t.type}`}>
          <span className="baseera-toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="baseera-toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
