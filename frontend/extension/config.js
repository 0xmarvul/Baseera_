// Baseera Security Scanner — Configuration
// Defaults point at localhost for local development. After installing from
// the Chrome Web Store, users can override these via the Options page
// (right-click the extension icon → "Options").

const BASEERA_DEFAULTS = {
  // .NET Web API base (must end without trailing slash; "/api" is appended in calls)
  apiBaseUrl: "http://localhost:5000/api",
  // Public-facing React web app (used for login redirect + dashboard links)
  appBaseUrl: "http://localhost:5173"
};

// Async helper used by popup/background/content to read the effective config.
// Falls back to defaults when no override has been saved.
async function getBaseeraConfig() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve({ ...BASEERA_DEFAULTS });
      return;
    }
    chrome.storage.local.get(["baseeraApiBaseUrl", "baseeraAppBaseUrl"], (result) => {
      resolve({
        apiBaseUrl: result.baseeraApiBaseUrl || BASEERA_DEFAULTS.apiBaseUrl,
        appBaseUrl: result.baseeraAppBaseUrl || BASEERA_DEFAULTS.appBaseUrl
      });
    });
  });
}

// Save user-provided overrides. Empty string clears the override.
async function setBaseeraConfig(apiBaseUrl, appBaseUrl) {
  return new Promise((resolve) => {
    const patch = {};
    if (apiBaseUrl !== undefined) patch.baseeraApiBaseUrl = apiBaseUrl.trim();
    if (appBaseUrl !== undefined) patch.baseeraAppBaseUrl = appBaseUrl.trim();
    chrome.storage.local.set(patch, resolve);
  });
}

// Expose to non-module scripts loaded via <script>
if (typeof window !== "undefined") {
  window.BaseeraConfig = { getBaseeraConfig, setBaseeraConfig, BASEERA_DEFAULTS };
}
