// Baseera Options page — read/write backend URLs to chrome.storage
const apiInput = document.getElementById('api-url');
const appInput = document.getElementById('app-url');
const status = document.getElementById('status');
const form = document.getElementById('config-form');
const resetBtn = document.getElementById('reset-btn');

function showStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#ff6b6b' : '#00d9a5';
  if (message) setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 3000);
}

async function loadCurrent() {
  const cfg = await window.BaseeraConfig.getBaseeraConfig();
  apiInput.value = cfg.apiBaseUrl;
  appInput.value = cfg.appBaseUrl;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const api = apiInput.value.trim();
  const app = appInput.value.trim();
  if (api && !/^https?:\/\//i.test(api)) { showStatus('API URL must start with http:// or https://', true); return; }
  if (app && !/^https?:\/\//i.test(app)) { showStatus('App URL must start with http:// or https://', true); return; }
  await window.BaseeraConfig.setBaseeraConfig(api, app);
  showStatus('Settings saved.');
});

resetBtn.addEventListener('click', async () => {
  await window.BaseeraConfig.setBaseeraConfig('', '');
  await loadCurrent();
  showStatus('Reset to defaults.');
});

loadCurrent();
