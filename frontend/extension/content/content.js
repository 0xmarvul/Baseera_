// Baseera Security Scanner - Content Script
// Passive observer - does not modify the page

(function() {
  'use strict';

  function safeSendMessage(msg) {
    try {
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(msg);
      }
    } catch (e) {
      // Extension context invalidated — silently ignore
    }
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'ready', url: window.location.href });
    }
  });

  // Check if current page is a configured Baseera website origin.
  // Production default mirrors BASEERA_DEFAULTS.appBaseUrl in config.js so
  // the content script behaves correctly before the saved override loads.
  function isBaseeraOrigin(savedAppUrl) {
    const candidates = [savedAppUrl, 'https://baseera-three.vercel.app'].filter(Boolean);
    return candidates.some(o => window.location.href.startsWith(o));
  }

  // Listen for auth updates from the Baseera website.
  // Gated by origin: a postMessage from a random attacker page must NOT be
  // able to push a forged auth token into the extension. Only the configured
  // Baseera app URL can use this channel.
  chrome.storage?.local?.get(['baseeraAppBaseUrl'], (r) => {
    if (!isBaseeraOrigin(r.baseeraAppBaseUrl)) return;

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      if (event.data?.type === 'BASEERA_AUTH_UPDATE') {
        safeSendMessage({
          type: 'SAVE_AUTH',
          token: event.data.token,
          userName: event.data.email || event.data.userName
        });
      }

      if (event.data?.type === 'BASEERA_AUTH_LOGOUT') {
        safeSendMessage({ type: 'CLEAR_AUTH' });
      }
    });
  });

  // On page load, sync current auth state from localStorage to extension storage
  (function syncOnLoad() {
    chrome.storage?.local?.get(['baseeraAppBaseUrl'], (r) => {
      if (!isBaseeraOrigin(r.baseeraAppBaseUrl)) return;
      doSync();
    });
  })();

  function doSync() {

    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('baseeraUserName');
    let email = '';

    try {
      const userData = localStorage.getItem('baseeraUserData');
      if (userData) {
        const parsed = JSON.parse(userData);
        email = parsed.email || '';
      }
    } catch (e) {}

    if (token) {
      safeSendMessage({
        type: 'SAVE_AUTH',
        token: token,
        userName: email || userName || ''
      });
    } else {
      safeSendMessage({ type: 'CLEAR_AUTH' });
    }
  }

  // Listen for localStorage changes (login/logout in other tabs)
  window.addEventListener('storage', (event) => {
    if (event.key === 'authToken') {
      if (event.newValue) {
        const userName = localStorage.getItem('baseeraUserName');
        let email = '';
        try {
          const userData = localStorage.getItem('baseeraUserData');
          if (userData) email = JSON.parse(userData).email || '';
        } catch (e) {}

        safeSendMessage({
          type: 'SAVE_AUTH',
          token: event.newValue,
          userName: email || userName || ''
        });
      } else {
        safeSendMessage({ type: 'CLEAR_AUTH' });
      }
    }
  });
})();
