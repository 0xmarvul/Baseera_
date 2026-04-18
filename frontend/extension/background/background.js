// Baseera Security Scanner - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Baseera Security Scanner installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_AUTH') {
    chrome.storage.local.set({
      authToken: message.token,
      userName: message.userName
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open
  }

  if (message.type === 'CLEAR_AUTH') {
    chrome.storage.local.remove(['authToken', 'userName'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_AUTH') {
    chrome.storage.local.get(['authToken', 'userName'], (result) => {
      sendResponse({ token: result.authToken, userName: result.userName });
    });
    return true;
  }
});

// Listen for external messages from the Baseera website
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_AUTH' || message.type === 'AUTH_TOKEN') {
    chrome.storage.local.set({
      authToken: message.token,
      userName: message.userName || message.email
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'CLEAR_AUTH' || message.type === 'BASEERA_AUTH_LOGOUT') {
    chrome.storage.local.remove(['authToken', 'userName'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_AUTH') {
    chrome.storage.local.get(['authToken', 'userName'], (result) => {
      sendResponse({ token: result.authToken, userName: result.userName });
    });
    return true;
  }
});

// When a Baseera website tab finishes loading, sync auth state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const baseeraOrigins = ['http://localhost:5173', 'https://localhost'];
    const isBaseeraTab = baseeraOrigins.some(origin => tab.url.startsWith(origin));

    if (isBaseeraTab) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          token: localStorage.getItem('authToken'),
          userName: localStorage.getItem('baseeraUserName'),
          userData: localStorage.getItem('baseeraUserData')
        })
      }).then(results => {
        const webAuth = results[0]?.result;
        if (webAuth?.token) {
          let displayName = webAuth.userName || '';
          if (!displayName && webAuth.userData) {
            try { displayName = JSON.parse(webAuth.userData).email || ''; } catch (e) {}
          }
          chrome.storage.local.set({ authToken: webAuth.token, userName: displayName });
        } else {
          chrome.storage.local.remove(['authToken', 'userName']);
        }
      }).catch(() => {});
    }
  }
});
