// Baseera Security Scanner - Popup Script
// Configuration - update these URLs for your deployment environment
const API_BASE_URL = 'http://localhost:5000/api';
const APP_BASE_URL = 'http://localhost:5173';

let scanResults = null;
let currentURL = '';
let scanCancelled = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
});

async function syncAuthFromWebsite() {
  try {
    const baseeraTabs = await chrome.tabs.query({ url: `${APP_BASE_URL}/*` });

    if (baseeraTabs.length > 0) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: baseeraTabs[0].id },
        func: () => ({
          token: localStorage.getItem('authToken'),
          userName: localStorage.getItem('baseeraUserName'),
          userData: localStorage.getItem('baseeraUserData')
        })
      });

      const webAuth = results[0]?.result;

      if (webAuth?.token) {
        let displayName = webAuth.userName || '';
        if (!displayName && webAuth.userData) {
          try {
            const parsed = JSON.parse(webAuth.userData);
            displayName = parsed.email || parsed.username || '';
          } catch (e) {}
        }
        await new Promise(resolve => {
          chrome.storage.local.set({ authToken: webAuth.token, userName: displayName }, resolve);
        });
      } else {
        await new Promise(resolve => {
          chrome.storage.local.remove(['authToken', 'userName'], resolve);
        });
      }
    }
  } catch (err) {
    console.log('Auth sync skipped:', err.message);
  }
}

async function initPopup() {
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentURL = tab?.url || '';
  document.getElementById('current-url').textContent = currentURL || 'Unknown';

  // Proactively sync auth from website's localStorage
  await syncAuthFromWebsite();

  // Check auth status
  await checkAuthStatus();

  // Bind scan button (state 1 → start scan)
  document.getElementById('scan-btn').addEventListener('click', runScan);

  // Bind rescan button (state 3 → start scan again)
  document.getElementById('rescan-btn').addEventListener('click', runScan);

  // Bind cancel button (state 2 → back to idle)
  document.getElementById('cancel-btn').addEventListener('click', () => {
    scanCancelled = true;
    showState('idle');
  });

  // Bind refresh URL button
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentURL = t?.url || '';
    document.getElementById('current-url').textContent = currentURL || 'Unknown';
  });

  // Bind open dashboard link
  document.getElementById('open-app-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        chrome.tabs.create({ url: `${APP_BASE_URL}/bugs` });
      } else {
        chrome.tabs.create({ url: `${APP_BASE_URL}/login` });
      }
    });
  });

  // Bind settings gear button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${APP_BASE_URL}/extension-settings` });
  });

  // Bind view previous results link
  document.getElementById('view-prev-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${APP_BASE_URL}/bugs` });
  });
}

function showState(state) {
  document.getElementById('state-idle').style.display = state === 'idle' ? 'block' : 'none';
  document.getElementById('state-scanning').style.display = state === 'scanning' ? 'block' : 'none';
  document.getElementById('state-results').style.display = state === 'results' ? 'block' : 'none';
}

async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'userName'], (result) => {
      const badge = document.getElementById('auth-status');
      if (result.authToken) {
        badge.textContent = result.userName ? `Logged in as ${result.userName}` : 'Authenticated';
        badge.className = 'auth-badge auth-badge--logged-in';
      } else {
        badge.textContent = 'Not logged in';
        badge.className = 'auth-badge auth-badge--guest';
        // Show a hint in the idle state
        const idleSubtitle = document.querySelector('.idle-subtitle');
        if (idleSubtitle) {
          idleSubtitle.textContent = 'Log in on Baseera website to save scan results automatically.';
        }
      }
      resolve(result.authToken);
    });
  });
}

async function runScan() {
  scanCancelled = false;
  showState('scanning');
  resetChecklist();
  animateChecklist();

  const scanStartTime = Date.now();

  try {
    // Execute scanner in page context
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runPageScanners,
      args: [currentURL]
    });

    if (scanCancelled) return;

    scanResults = results[0]?.result || { vulnerabilities: [], riskScore: 0 };
  } catch (err) {
    console.error('Scan error:', err);
    if (scanCancelled) return;
    scanResults = { vulnerabilities: [], riskScore: 0, error: err.message };
  }

  if (scanCancelled) return;

  const elapsed = Date.now() - scanStartTime;
  const minDuration = 3000;
  if (elapsed < minDuration) {
    await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
  }

  if (scanCancelled) return;
  completeChecklist();
  displayResults(scanResults);
}

function resetChecklist() {
  const ids = ['check-ssl', 'check-scripts', 'check-vulns', 'check-headers', 'check-exploits'];
  ids.forEach(id => {
    const icon = document.querySelector(`#${id} .check-icon`);
    if (icon) icon.className = 'check-icon check-pending';
  });
}

function animateChecklist() {
  const steps = ['check-ssl', 'check-scripts', 'check-vulns', 'check-headers', 'check-exploits'];
  const delays = [400, 900, 1400, 1900, 2400];

  steps.forEach((id, i) => {
    setTimeout(() => {
      if (scanCancelled) return;
      const icon = document.querySelector(`#${id} .check-icon`);
      if (!icon) return;
      // Mark previous as done
      if (i > 0) {
        const prevIcon = document.querySelector(`#${steps[i - 1]} .check-icon`);
        if (prevIcon) prevIcon.className = 'check-icon check-done';
      }
      icon.className = 'check-icon check-active';
    }, delays[i]);
  });
}

function completeChecklist() {
  const steps = ['check-ssl', 'check-scripts', 'check-vulns', 'check-headers', 'check-exploits'];
  steps.forEach(id => {
    const icon = document.querySelector(`#${id} .check-icon`);
    if (icon) icon.className = 'check-icon check-done';
  });
}

function displayResults(results) {
  const vulns = results.vulnerabilities || [];
  const critical = vulns.filter(v => v.severity === 'Critical').length;
  const high = vulns.filter(v => v.severity === 'High').length;
  const medium = vulns.filter(v => v.severity === 'Medium').length;
  const low = vulns.filter(v => v.severity === 'Low').length;

  // Update summary counts
  document.getElementById('count-critical').textContent = critical;
  document.getElementById('count-high').textContent = high;
  document.getElementById('count-medium').textContent = medium;
  document.getElementById('count-low').textContent = low;

  // Build results center content
  const resultsCenter = document.getElementById('results-center');
  if (vulns.length === 0) {
    resultsCenter.innerHTML = `
      <div class="result-icon">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#00BC7D" stroke-width="1.5" fill="rgba(0,188,125,0.08)"/>
          <path d="M9 12l2 2 4-4" stroke="#00BC7D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="result-main-title">Scan Completed</p>
      <p class="result-main-subtitle--safe">No security issues found!</p>
    `;
    document.getElementById('vuln-summary-card').style.display = 'none';
  } else {
    resultsCenter.innerHTML = `
      <div class="result-icon">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" stroke-width="1.5" fill="rgba(245,158,11,0.1)"/>
          <line x1="12" y1="9" x2="12" y2="13" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="result-main-title">Scan Completed</p>
      <p class="result-main-subtitle">Some security concerns found</p>
    `;
    document.getElementById('vuln-summary-card').style.display = 'block';
    autoSaveResults();
  }

  showState('results');
}

async function autoSaveResults() {
  const token = await new Promise(resolve => {
    chrome.storage.local.get(['authToken'], r => resolve(r.authToken));
  });

  if (!token || !scanResults) return; // Silently skip if not logged in

  try {
    await fetch(`${API_BASE_URL}/scans/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetURL: currentURL,
        riskScore: scanResults.riskScore || 0,
        vulnerabilities: (scanResults.vulnerabilities || []).map(v => ({
          type: v.type,
          severity: v.severity,
          description: v.description,
          location: v.location || currentURL,
          recommendation: v.recommendation || null
        }))
      })
    });
  } catch (err) {
    console.error('Auto-save error:', err);
  }
}

// This function runs in the page context
function runPageScanners(pageUrl) {
  const vulnerabilities = [];

  function addVuln(type, severity, description, location, recommendation) {
    vulnerabilities.push({ type, severity, description, location: location || pageUrl, recommendation });
  }

  // 1. XSS - Check for inline scripts, eval(), innerHTML usage
  try {
    const scripts = document.querySelectorAll('script:not([src])');
    const dangerousPatterns = /eval\s*\(|innerHTML\s*=|document\.write\s*\(|javascript:/i;
    scripts.forEach(s => {
      if (dangerousPatterns.test(s.textContent)) {
        addVuln('XSS', 'Critical', 'Potentially unsafe inline JavaScript detected (eval/innerHTML/document.write).', pageUrl, 'Avoid eval(), use textContent instead of innerHTML, and remove document.write().');
      }
    });
    const allElements = document.querySelectorAll('[onclick],[onmouseover],[onerror],[onload]');
    if (allElements.length > 0) {
      addVuln('XSS', 'High', `Found ${allElements.length} element(s) with inline event handlers.`, pageUrl, 'Use addEventListener instead of inline event handlers.');
    }
    const links = document.querySelectorAll('a[href^="javascript:"]');
    if (links.length > 0) {
      addVuln('XSS', 'Critical', `Found ${links.length} link(s) using javascript: URLs.`, pageUrl, 'Avoid javascript: URLs in href attributes.');
    }
  } catch (e) {}

  // 2. SQL Injection - Check for SQL error messages
  try {
    const body = document.body?.textContent || '';
    const sqlErrors = /SQL syntax|mysql_fetch|ORA-\d+|syntax error.*SQL|ODBC.*Error|Warning.*mysql|Microsoft.*ODBC/i;
    if (sqlErrors.test(body)) {
      addVuln('SQL Injection', 'Critical', 'SQL error messages found in page response.', pageUrl, 'Hide database errors from end users and use parameterized queries.');
    }
  } catch (e) {}

  // 3. Command Injection - Check for system error patterns
  try {
    const body = document.body?.textContent || '';
    const cmdErrors = /sh:\s+\d+:|permission denied|command not found|bash:/i;
    if (cmdErrors.test(body)) {
      addVuln('Command Injection', 'Critical', 'System command error output detected in page.', pageUrl, 'Never expose command output to users. Sanitize inputs thoroughly.');
    }
  } catch (e) {}

  // 4. API Keys Exposure
  try {
    const html = document.documentElement.innerHTML;
    const patterns = [
      { regex: /AIza[0-9A-Za-z-_]{35}/g, name: 'Google API Key' },
      { regex: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key' },
      { regex: /sk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI/Stripe Secret Key' },
      { regex: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
      { regex: /firebase.*apiKey.*['"]\w{20,}/i, name: 'Firebase API Key' }
    ];
    patterns.forEach(p => {
      if (p.regex.test(html)) {
        addVuln('API Keys Exposure', 'Critical', `Exposed ${p.name} detected in page source.`, pageUrl, 'Move API keys to server-side environment variables.');
      }
    });
  } catch (e) {}

  // 5. Insecure Forms
  try {
    if (pageUrl.startsWith('http://')) {
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      if (passwordInputs.length > 0) {
        addVuln('Insecure Forms', 'Critical', 'Password input found on HTTP (non-HTTPS) page.', pageUrl, 'Always serve forms with password fields over HTTPS.');
      }
    }
  } catch (e) {}

  // 6. Missing CSP
  try {
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!metaCSP) {
      addVuln('Missing CSP', 'High', 'No Content-Security-Policy meta tag found.', pageUrl, 'Add a Content-Security-Policy header or meta tag to prevent XSS attacks.');
    }
  } catch (e) {}

  // 7. Mixed Content
  try {
    if (pageUrl.startsWith('https://')) {
      const httpImages = document.querySelectorAll('img[src^="http://"]');
      const httpScripts = document.querySelectorAll('script[src^="http://"]');
      const httpLinks = document.querySelectorAll('link[href^="http://"]');
      const total = httpImages.length + httpScripts.length + httpLinks.length;
      if (total > 0) {
        addVuln('Mixed Content', 'Medium', `${total} resource(s) loaded over HTTP on an HTTPS page.`, pageUrl, 'Ensure all resources are loaded over HTTPS.');
      }
    }
  } catch (e) {}

  // 8. Clickjacking
  try {
    const metaFrame = document.querySelector('meta[http-equiv="X-Frame-Options"]');
    if (!metaFrame) {
      addVuln('Clickjacking', 'Medium', 'No X-Frame-Options meta tag found.', pageUrl, 'Add X-Frame-Options: DENY or SAMEORIGIN header to prevent clickjacking.');
    }
  } catch (e) {}

  // 9. Insecure Cookies (detected via JS-accessible cookies)
  try {
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      if (cookies.length > 0) {
        addVuln('Insecure Cookies', 'Medium', `${cookies.length} cookie(s) accessible via JavaScript (missing HttpOnly flag).`, pageUrl, 'Set the HttpOnly flag on sensitive cookies to prevent JavaScript access.');
      }
    }
  } catch (e) {}

  // 10. Missing SRI
  try {
    const externalScripts = document.querySelectorAll('script[src]:not([integrity])');
    let externalCount = 0;
    externalScripts.forEach(s => {
      const src = s.getAttribute('src') || '';
      if (src.startsWith('http') && !src.includes(window.location.hostname)) externalCount++;
    });
    if (externalCount > 0) {
      addVuln('Missing SRI', 'Medium', `${externalCount} external script(s) loaded without Subresource Integrity (SRI).`, pageUrl, 'Add integrity and crossorigin attributes to external scripts.');
    }
  } catch (e) {}

  // 11. Deprecated HTML
  try {
    const deprecated = ['font', 'center', 'marquee', 'blink', 'strike', 'big', 'tt'];
    let found = [];
    deprecated.forEach(tag => {
      if (document.querySelector(tag)) found.push(`<${tag}>`);
    });
    if (found.length > 0) {
      addVuln('Deprecated HTML', 'Low', `Deprecated HTML tags found: ${found.join(', ')}.`, pageUrl, 'Replace deprecated HTML tags with modern CSS equivalents.');
    }
  } catch (e) {}

  // 12. Open Redirect
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParams = ['redirect', 'url', 'next', 'return', 'returnUrl', 'goto', 'destination'];
    redirectParams.forEach(param => {
      const val = urlParams.get(param);
      if (val && (val.startsWith('http') || val.startsWith('//'))) {
        addVuln('Open Redirect', 'Medium', `URL parameter "${param}" may allow open redirect: ${val}`, pageUrl, 'Validate and whitelist redirect URLs on the server side.');
      }
    });
  } catch (e) {}

  // 13. CSRF - Forms without tokens
  try {
    const forms = document.querySelectorAll('form[method="post"], form[method="POST"]');
    let unsafeForms = 0;
    forms.forEach(form => {
      const hasToken = form.querySelector('input[name*="csrf"], input[name*="token"], input[name*="_token"]');
      if (!hasToken) unsafeForms++;
    });
    if (unsafeForms > 0) {
      addVuln('CSRF', 'Medium', `${unsafeForms} POST form(s) found without visible CSRF tokens.`, pageUrl, 'Include CSRF tokens in all state-changing forms.');
    }
  } catch (e) {}

  // 14. Sensitive File Paths (admin, .git, .env in links)
  try {
    const allLinks = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
    const sensitivePatterns = /\/(\.git|\.env|\.htaccess|wp-admin|phpmyadmin|admin|backup|config)/i;
    const sensitiveLinks = allLinks.filter(href => sensitivePatterns.test(href));
    if (sensitiveLinks.length > 0) {
      addVuln('Sensitive Files', 'High', `Found ${sensitiveLinks.length} link(s) to potentially sensitive paths.`, sensitiveLinks[0], 'Restrict access to sensitive directories and files.');
    }
  } catch (e) {}

  // 15. Excessive Trackers
  try {
    const trackerDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.net', 'hotjar.com', 'mixpanel.com', 'segment.com'];
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    const foundTrackers = trackerDomains.filter(t => scripts.some(s => s.includes(t)));
    if (foundTrackers.length >= 3) {
      addVuln('Excessive Trackers', 'Low', `${foundTrackers.length} analytics/tracking scripts detected: ${foundTrackers.join(', ')}.`, pageUrl, 'Review third-party tracking scripts for privacy compliance (GDPR/CCPA).');
    }
  } catch (e) {}

  // 16. Debug Pages
  try {
    const urlLower = pageUrl.toLowerCase();
    const debugPaths = ['/debug', '/test', '/trace', '/phpinfo', '/server-info', '/_debug'];
    const isDebugPage = debugPaths.some(p => urlLower.includes(p));
    if (isDebugPage) {
      addVuln('Debug Pages', 'Medium', 'Current page may be a debug/test endpoint exposed to the public.', pageUrl, 'Disable and restrict access to debug endpoints in production.');
    }
  } catch (e) {}

  // 17. CORS Issues
  try {
    const metaTags = document.querySelectorAll('meta[name]');
    // Check for wildcard CORS hints in meta (limited passive check)
    const html = document.documentElement.outerHTML;
    if (html.includes('Access-Control-Allow-Origin: *') || html.includes("'Access-Control-Allow-Origin', '*'")) {
      addVuln('CORS Issues', 'Medium', 'Wildcard CORS policy detected in page source.', pageUrl, 'Restrict CORS to specific trusted origins instead of using wildcards.');
    }
  } catch (e) {}

  // 18. Missing HSTS (passive check via meta)
  try {
    if (pageUrl.startsWith('https://')) {
      const metaHSTS = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
      if (!metaHSTS) {
        addVuln('Missing HSTS', 'Medium', 'No Strict-Transport-Security meta tag found.', pageUrl, 'Enable HSTS to prevent protocol downgrade attacks.');
      }
    }
  } catch (e) {}

  // 19. Insecure localStorage usage (sensitive data)
  try {
    const lsKeys = Object.keys(localStorage);
    const sensitiveKeys = lsKeys.filter(k => /password|secret|token|api_key|credit|ssn/i.test(k));
    if (sensitiveKeys.length > 0) {
      addVuln('Insecure Storage', 'High', `Potentially sensitive data stored in localStorage: ${sensitiveKeys.join(', ')}.`, pageUrl, 'Avoid storing sensitive data in localStorage. Use secure server-side sessions instead.');
    }
  } catch (e) {}

  // 20. Weak CSP (unsafe-inline, unsafe-eval)
  try {
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (metaCSP) {
      const content = metaCSP.getAttribute('content') || '';
      if (content.includes("'unsafe-inline'") || content.includes("'unsafe-eval'") || content.includes('*')) {
        addVuln('Weak CSP', 'High', "Content-Security-Policy contains unsafe directives ('unsafe-inline', 'unsafe-eval', or wildcards).", pageUrl, "Remove 'unsafe-inline' and 'unsafe-eval' from CSP and use nonces or hashes instead.");
      }
    }
  } catch (e) {}

  // Calculate risk score
  const weights = { Critical: 25, High: 15, Medium: 8, Low: 3 };
  let rawScore = 0;
  vulnerabilities.forEach(v => { rawScore += weights[v.severity] || 0; });
  const riskScore = Math.min(100, rawScore);

  return { vulnerabilities, riskScore };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}
