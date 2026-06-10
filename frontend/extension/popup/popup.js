// Baseera Security Scanner - Popup Script
// API/App URLs are loaded from chrome.storage at startup (configurable via Options page).
// Initial values mirror BASEERA_DEFAULTS in ../config.js so any code running
// before getBaseeraConfig() resolves still uses production URLs, not localhost.
let API_BASE_URL = 'https://baseera-api.runasp.net/api';
let APP_BASE_URL = 'https://baseera-three.vercel.app';

let scanResults = null;
let currentURL = '';
let scanCancelled = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.BaseeraConfig?.getBaseeraConfig === 'function') {
    const cfg = await window.BaseeraConfig.getBaseeraConfig();
    API_BASE_URL = cfg.apiBaseUrl;
    APP_BASE_URL = cfg.appBaseUrl;
  }
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
    // Auth sync from website tab is best-effort; silent fail is fine.
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
    if (scanCancelled) return;
    scanResults = { vulnerabilities: [], riskScore: 0, error: err.message };
  }

  if (scanCancelled) return;

  // Animation feel-floor. Real scan is usually <500ms but the checklist
  // animation takes time to look thorough. 1.5s is the sweet spot — long
  // enough that the user sees the steps tick through, short enough that
  // repeat scans on the same site don't feel sluggish.
  const elapsed = Date.now() - scanStartTime;
  const minDuration = 1500;
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
  // Compressed to fit inside the 1.5s minDuration floor (was 400-2400ms,
  // tuned for the old 3s floor). All five steps tick before the results
  // appear; last one settles ~300ms before completion so the transition
  // feels intentional.
  const delays = [200, 450, 700, 950, 1200];

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
    // Silent fail. Auto-save is best-effort; user can manually save later.
  }
}

// This function runs in the page context
function runPageScanners(pageUrl) {
  const vulnerabilities = [];

  function addVuln(type, severity, description, location, recommendation) {
    vulnerabilities.push({ type, severity, description, location: location || pageUrl, recommendation });
  }

  // 1. XSS - dangerous patterns, javascript: URL, iframe srcdoc, reflected-parameter
  try {
    const scripts = document.querySelectorAll('script:not([src])');
    const dangerousPatterns = /eval\s*\(|innerHTML\s*=|document\.write\s*\(|javascript:/i;
    scripts.forEach(s => {
      if (dangerousPatterns.test(s.textContent)) {
        addVuln('XSS', 'Medium', 'Potentially unsafe inline JavaScript patterns detected (eval/innerHTML/document.write). This is a code-smell, not a confirmed XSS — review manually.', pageUrl, 'Avoid eval(), use textContent instead of innerHTML, and remove document.write().');
      }
    });
    const jsUrls = document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]');
    if (jsUrls.length > 0) {
      addVuln('XSS', 'Critical', `Found ${jsUrls.length} element(s) using javascript: URLs (href/action).`, pageUrl, 'Avoid javascript: URLs. Bind click/submit handlers via addEventListener.');
    }
    if (document.querySelectorAll('iframe[srcdoc]').length > 0) {
      addVuln('XSS', 'High', 'iframe with srcdoc attribute detected (inline HTML injection surface).', pageUrl, 'Avoid srcdoc with untrusted content; sandbox iframes with restrictive attributes.');
    }
    // Reflected URL parameter — only fire when the value lands in a *dangerous*
    // context (script body, an inline event-handler attribute, a javascript:
    // URL, an unencoded src). Plain echo into body text (search results,
    // breadcrumbs) is not a vulnerability, so we no longer flag it.
    const params = new URLSearchParams(location.search);
    const hash = location.hash.slice(1);
    const values = [...Array.from(params.values()), hash].filter(v => v && v.length >= 6);
    if (values.length > 0) {
      const inlineScripts = Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent || '').join('\n');
      const handlerAttrs = ['onclick','onerror','onload','onmouseover','onfocus','onblur','onsubmit','onchange'];
      const handlerText = Array.from(document.querySelectorAll('[onclick],[onerror],[onload],[onmouseover],[onfocus],[onblur],[onsubmit],[onchange]'))
        .flatMap(el => handlerAttrs.map(a => el.getAttribute(a) || '').filter(Boolean))
        .join('\n');
      const jsHrefs = Array.from(document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]'))
        .map(el => (el.getAttribute('href') || el.getAttribute('action') || ''))
        .join('\n');
      const srcAttrs = Array.from(document.querySelectorAll('img[src], iframe[src], script[src]'))
        .map(el => el.getAttribute('src') || '')
        .join('\n');
      const dangerousContext = inlineScripts + '\n' + handlerText + '\n' + jsHrefs + '\n' + srcAttrs;
      // High-confidence: URL param value lands inside an executable
      // context. This IS active XSS surface, flag at High.
      for (const v of values) {
        if (dangerousContext.indexOf(v) !== -1) {
          addVuln('Reflected XSS', 'High', 'URL parameter value lands inside a dangerous context (inline script / event handler / javascript: URL / src attribute) without encoding.', pageUrl, 'HTML-encode user input before inserting into the DOM. Never echo URL parameters into <script> blocks, event-handler attributes, or src attributes without strict sanitisation.');
          break;
        }
      }
      // Lower-confidence: URL param value appears in the rendered body
      // text. Could be a legitimate echo (search results header) OR an
      // XSS sink waiting for an attacker payload. PortSwigger's "Reflected
      // XSS into HTML context with nothing encoded" lab matches exactly
      // this pattern. Flag at Medium so users investigate but the page
      // doesn't get spammed with high-severity alerts on every search
      // results page they visit.
      try {
        const bodyText = document.body?.innerText || '';
        for (const v of values) {
          if (v.length >= 8 && bodyText.indexOf(v) !== -1) {
            addVuln(
              'Reflected Input in Page',
              'Medium',
              'A URL parameter value is reflected into the page body. If the page does not HTML-encode this value, an attacker can inject script tags via a crafted URL (classic reflected XSS).',
              pageUrl,
              'Confirm the value is HTML-encoded before insertion. Test by replacing the parameter with <script>alert(1)</script> in a safe environment - if it executes, you have reflected XSS. Use textContent or a templating library that auto-escapes.'
            );
            break;
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 1b. Inline Event Handlers — renamed from 'XSS' Low so it stops looking
  // like a confirmed XSS finding. These are CSP-bypass surface + code-quality.
  try {
    const handlers = document.querySelectorAll('[onclick],[onmouseover],[onerror],[onload],[onfocus],[onblur],[onsubmit],[onchange]');
    if (handlers.length > 0) {
      addVuln('Inline Event Handlers', 'Low', `Found ${handlers.length} element(s) using inline event handler attributes (onclick, onerror, etc.). Not a vulnerability on its own — but they defeat strict CSP and make code review harder.`, pageUrl, "Move handlers to addEventListener in a separate script file. Enables Content-Security-Policy 'script-src' to drop 'unsafe-inline'.");
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

  // 4. API Keys Exposure - expanded provider coverage
  try {
    const html = document.documentElement.innerHTML;
    const patterns = [
      { regex: /AIza[0-9A-Za-z\-_]{35}/, name: 'Google API Key' },
      { regex: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
      { regex: /sk-[A-Za-z0-9]{48}/, name: 'OpenAI API Key' },
      { regex: /sk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Secret Key (live)' },
      { regex: /pk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Publishable Key (live)' },
      { regex: /rk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Restricted Key (live)' },
      { regex: /ghp_[A-Za-z0-9]{36}/, name: 'GitHub Personal Access Token' },
      { regex: /gho_[A-Za-z0-9]{36}/, name: 'GitHub OAuth Token' },
      { regex: /xox[baprs]-[0-9A-Za-z\-]{10,}/, name: 'Slack Token' },
      { regex: /AC[a-f0-9]{32}/, name: 'Twilio Account SID' },
      { regex: /SK[a-f0-9]{32}/, name: 'Twilio API Key' },
      { regex: /SG\.[\w\-]{22}\.[\w\-]{43}/, name: 'SendGrid API Key' },
      { regex: /key-[0-9a-zA-Z]{32}/, name: 'Mailgun API Key' },
      { regex: /sq0(?:atp|csp)-[0-9A-Za-z\-_]{22,43}/, name: 'Square Token' },
      { regex: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/, name: 'JWT Token' },
      { regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, name: 'Private Key Block' },
      { regex: /AccountKey=[A-Za-z0-9+/=]{40,}/, name: 'Azure Storage Account Key' },
      { regex: /"type":\s*"service_account"/, name: 'GCP Service Account JSON' },
      { regex: /firebase[^,]{0,30}apiKey[^,]{0,10}["'][A-Za-z0-9_\-]{20,}["']/i, name: 'Firebase API Key' },
    ];
    patterns.forEach(p => {
      if (p.regex.test(html)) {
        addVuln('API Keys Exposure', 'Critical', `Exposed ${p.name} detected in page source.`, pageUrl, 'Move secrets to server-side environment variables. Rotate any leaked credential immediately.');
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
      addVuln('Missing CSP', 'Medium', 'No Content-Security-Policy meta tag found. CSP is the primary anti-XSS defence-in-depth control; absent CSP leaves the page reliant on output encoding alone.', pageUrl, 'Add a Content-Security-Policy header (or meta tag) restricting script-src, style-src, and frame-ancestors. Start with report-only mode to discover violations.');
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

  // 11. (Removed — Deprecated HTML was a style/legacy concern, not security.)

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
      addVuln('CSRF', 'Medium', `${unsafeForms} POST form(s) found without a visible CSRF token hidden field. This is a DOM-only heuristic and may be a false positive on modern frameworks that use cookie-based CSRF (SameSite=Strict cookies) or header tokens (X-CSRF-Token, X-XSRF-TOKEN) instead of hidden form fields.`, pageUrl, 'Verify your framework uses one of: SameSite=Strict cookies, a synchroniser-token pattern, or an anti-forgery header. If none, add a CSRF token hidden field to every state-changing form.');
    }
  } catch (e) {}

  // 14. Sensitive File Paths + admin/debug surfaces (links, scripts, iframes, comments, and the page URL itself)
  try {
    const patterns = /\/(\.git(\/|$)|\.svn\/|\.hg\/|\.env(\.|$|\/)|\.htaccess|\.htpasswd|\.DS_Store|\.idea\/|\.vscode\/|\.aws\/|\.npmrc|\.bak|\.old|\.orig|\.swp|id_rsa|id_dsa|Thumbs\.db|wp-admin|wp-config|phpmyadmin|phpinfo\.php|server-status|server-info|web\.config|composer\.lock|package-lock\.json|database\.sql|config\.(php|json|yml|yaml|inc\.php)|admin(istrator)?(\/|$|\?|\.php)|admin[-_]?(panel|cp|console)(\/|$|\?)|swagger(-ui)?(\/|$|\?)|api-docs(\/|$|\?)|openapi(\.json|\.yaml|\/|$)|graphql(\/|$|\?)|graphiql(\/|$|\?)|actuator(\/|$|\?)|jolokia(\/|$|\?)|console(\/|$|\?)|(private|internal|intranet)(\/|$|\?)|(backup|backups|bak|old|archive)(\/|$|\?|\.)|cgi-bin\/|\/bin(\/|$)|\/ws(\/|$)|\/sbin(\/|$)|\/etc(\/|$)|\/proc(\/|$)|\/tmp(\/|$)|\.svn\/wc\.db|\.git\/HEAD|\.git\/config|\.git\/index|core\.dump|crash\.log|dump\.sql|dump\.tar|robots\.txt\?|sitemap\.xml\?|wp-content\/(uploads|debug\.log)|node_modules\/|vendor\/|tests?\/|spec\/|fixtures?\/)/i;
    const urls = new Set();
    if (pageUrl) urls.add(pageUrl);
    document.querySelectorAll('a[href], link[href], script[src], img[src], iframe[src], source[src]').forEach(el => {
      const v = el.getAttribute('href') || el.getAttribute('src') || '';
      if (v) urls.add(v);
    });
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
    let n; while ((n = walker.nextNode())) { urls.add(n.nodeValue || ''); }
    const hits = [...urls].filter(u => patterns.test(u));
    if (hits.length > 0) {
      addVuln('Sensitive Files', 'High', `Found ${hits.length} reference(s) to potentially sensitive paths.`, hits[0].slice(0, 200), 'Block access at the web server level. Remove backup and VCS files from production.');
    }
    if (typeof document.title === 'string' && document.title.toLowerCase().startsWith('index of /')) {
      addVuln('Directory Listing', 'Medium', 'Directory listing is enabled on this endpoint.', pageUrl, 'Disable directory listing (Options -Indexes in Apache, autoindex off in Nginx).');
    }
  } catch (e) {}

  // 15. Excessive Trackers
  try {
    const trackerDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.net', 'hotjar.com', 'mixpanel.com', 'segment.com'];
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    const foundTrackers = trackerDomains.filter(t => scripts.some(s => s.includes(t)));
    if (foundTrackers.length >= 5) {
      addVuln('Excessive Trackers', 'Low', `5+ third-party tracking scripts detected (${foundTrackers.length} total): ${foundTrackers.join(', ')}. Each tracker is a third-party supply-chain dependency that can be hijacked, and a GDPR/CCPA consent surface.`, pageUrl, 'Audit each tracker for business need. Remove duplicates and obsolete pixels. Ensure your cookie banner asks consent for each tracking purpose under GDPR/CCPA.');
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

  // 21. Outdated JavaScript Libraries
  try {
    const lt = (a, b) => {
      const pa = String(a).split('.').map(Number);
      const pb = String(b).split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x !== y) return x < y;
      }
      return false;
    };
    const report = (name, version, minSafe) => addVuln('Outdated Components', 'High',
      `${name} ${version} is older than the recommended ${minSafe}. Known CVEs may apply.`,
      pageUrl,
      `Upgrade ${name} to ${minSafe} or later. Audit regularly with Retire.js, npm audit, or Snyk.`);
    try { if (window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery && lt(window.jQuery.fn.jquery, '3.5.0')) report('jQuery', window.jQuery.fn.jquery, '3.5.0'); } catch (e) {}
    try { if (window.angular && window.angular.version && window.angular.version.full && window.angular.version.full.startsWith('1.')) report('AngularJS', window.angular.version.full, '(migrate off — AngularJS 1.x is end-of-life)'); } catch (e) {}
    try { if (window._ && window._.VERSION && lt(window._.VERSION, '4.17.21')) report('lodash', window._.VERSION, '4.17.21'); } catch (e) {}
    try {
      const b = document.querySelector('link[href*="bootstrap"], script[src*="bootstrap"]');
      if (b) {
        const src = b.getAttribute('href') || b.getAttribute('src') || '';
        const m = src.match(/bootstrap[.\-/@](\d+\.\d+\.\d+)/i);
        if (m && lt(m[1], '4.3.1')) report('Bootstrap', m[1], '4.3.1');
      }
    } catch (e) {}
    try { if (window.Vue && window.Vue.version && window.Vue.version.startsWith('2.')) report('Vue 2.x', window.Vue.version, '3.x (Vue 2 reached end-of-life Dec 2023)'); } catch (e) {}
    try { if (window.moment && window.moment.version) report('Moment.js', window.moment.version, 'a modern alternative (date-fns, dayjs, Luxon)'); } catch (e) {}
  } catch (e) {}

  // 22. DOM-based XSS Sinks (source → sink in inline scripts)
  try {
    const sourceRe = /\b(location\.(hash|search|href)|document\.(URL|documentURI|referrer)|window\.name)\b/;
    const sinkRe = /\b(innerHTML|outerHTML)\s*=|document\.write\s*\(|\beval\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]|\bFunction\s*\(/;
    const scripts = document.querySelectorAll('script:not([src])');
    let hits = 0;
    scripts.forEach(s => {
      const code = s.textContent || '';
      if (sourceRe.test(code) && sinkRe.test(code)) hits++;
    });
    if (hits > 0) {
      addVuln('DOM-based XSS', 'High', `${hits} inline script(s) pipe an untrusted source (location/referrer/window.name) into a dangerous sink.`, pageUrl, 'Treat location.*, document.referrer, and window.name as untrusted. Sanitize before rendering; prefer textContent and safe DOM APIs.');
    }
  } catch (e) {}

  // 23. Insecure postMessage (listener without origin check)
  try {
    const listenerRe = /addEventListener\s*\(\s*["'`]message["'`]/;
    const originRe = /\b(e|ev|evt|event|msg)\.origin\b/;
    const scripts = document.querySelectorAll('script:not([src])');
    let hits = 0;
    scripts.forEach(s => {
      const code = s.textContent || '';
      if (listenerRe.test(code) && !originRe.test(code)) hits++;
    });
    if (hits > 0) {
      addVuln('Insecure postMessage', 'High', `${hits} 'message' event listener(s) do not verify event.origin.`, pageUrl, 'Always validate event.origin against an allow-list inside message handlers; never trust the payload blindly.');
    }
  } catch (e) {}

  // 24. Session / Token in URL
  try {
    const url = String(pageUrl || location.href);
    if (/[?&#](jsessionid|phpsessid|sid|sessionid|token|access_token|id_token|auth|apikey|api_key)=/i.test(url)) {
      addVuln('Session Token in URL', 'High', 'Session or authentication token transmitted via URL parameters.', pageUrl, 'Move tokens into the Authorization header or HttpOnly cookies. URLs are logged in proxies, browser history, and referrer headers.');
    }
  } catch (e) {}

  // 25. Missing Security Headers (meta equivalents)
  try {
    const checks = [
      { attr: 'X-Content-Type-Options', rec: 'Add X-Content-Type-Options: nosniff to prevent MIME sniffing.' },
      { attr: 'Referrer-Policy', rec: 'Add Referrer-Policy: strict-origin-when-cross-origin (or stricter).' },
      { attr: 'Permissions-Policy', rec: 'Add Permissions-Policy to restrict powerful features (camera, microphone, geolocation).' },
      { attr: 'Cross-Origin-Opener-Policy', rec: 'Add Cross-Origin-Opener-Policy: same-origin to mitigate Spectre-class side-channel leaks.' },
    ];
    checks.forEach(c => {
      if (!document.querySelector(`meta[http-equiv="${c.attr}" i]`)) {
        addVuln(`Missing ${c.attr}`, 'Low', `No ${c.attr} meta tag detected on this page (defense-in-depth hardening, not a direct vulnerability).`, pageUrl, c.rec);
      }
    });
  } catch (e) {}

  // 26. Source Map Exposure
  try {
    const re = /\/[*/]#\s*sourceMappingURL\s*=\s*([^\s*]+)/;
    const maps = new Set();
    document.querySelectorAll('script:not([src])').forEach(s => {
      const m = (s.textContent || '').match(re);
      if (m) maps.add(m[1]);
    });
    const htmlMatch = document.documentElement.innerHTML.match(re);
    if (htmlMatch) maps.add(htmlMatch[1]);
    if (maps.size > 0) {
      addVuln('Source Map Exposure', 'Medium', `Source map reference(s) detected: ${[...maps].slice(0, 3).join(', ')}.`, pageUrl, 'Do not ship .map files to production, or restrict access via web-server rules. Source maps reveal original code.');
    }
  } catch (e) {}

  // 27. (Removed — Sensitive Autocomplete contradicted NIST 800-63B guidance,
  // which now favours password-manager autofill rather than discouraging it.)


  // 28. Server / Technology Version Disclosure
  try {
    const findings = [];
    const gen = document.querySelector('meta[name="generator" i]');
    if (gen) {
      const v = gen.getAttribute('content') || '';
      if (v.trim()) findings.push(`generator meta: "${v.slice(0, 80)}"`);
    }
    const html = document.documentElement.innerHTML;
    const banners = [
      /WordPress\s*\d+(\.\d+)+/i,
      /Drupal\s*\d+(\.\d+)+/i,
      /Joomla!?\s*\d+(\.\d+)+/i,
      /powered by [^<\n]{0,60}/i,
      /phpMyAdmin\s+\d+(\.\d+)+/i,
      /Apache\/\d+(\.\d+)+/i,
      /nginx\/\d+(\.\d+)+/i,
    ];
    banners.forEach(re => { const m = html.match(re); if (m) findings.push(m[0].slice(0, 80)); });
    if (findings.length > 0) {
      addVuln('Version Disclosure', 'Low', `Framework / server version leaked: ${findings.slice(0, 3).join('; ')}.`, pageUrl, 'Remove the generator meta tag and strip server/version headers at your reverse proxy.');
    }
  } catch (e) {}

  // 30. External Form Action
  try {
    const pageOrigin = location.origin;
    const forms = document.querySelectorAll('form[action]');
    const external = [];
    forms.forEach(f => {
      const action = f.getAttribute('action') || '';
      if (!action || action.startsWith('#') || action.startsWith('/') || action.startsWith('?')) return;
      try {
        const u = new URL(action, location.href);
        if (u.origin && u.origin !== pageOrigin) external.push(`${u.origin}${u.pathname}`);
      } catch (e) {}
    });
    if (external.length > 0) {
      const hasPassword = Array.from(document.querySelectorAll('form input[type="password"]')).length > 0;
      addVuln('External Form Action', hasPassword ? 'High' : 'Medium', `${external.length} form(s) submit to a different origin: ${external.slice(0, 3).join(', ')}.`, pageUrl, 'Only submit sensitive forms to your own backend. If an external action is intentional, verify it over HTTPS and document the dependency.');
    }
  } catch (e) {}

  // 31. Mixed-content WebSocket (passive DOM-only scan; we do NOT open any socket)
  try {
    if (location.protocol === 'https:') {
      const wsHits = new Set();
      const scriptText = Array.from(document.querySelectorAll('script:not([src])'))
        .map(s => s.textContent || '').join('\n');
      const wsRegex = /\bws:\/\/[^"'\s)<>]+/gi;
      let m;
      while ((m = wsRegex.exec(scriptText)) !== null) wsHits.add(m[0].slice(0, 120));
      document.querySelectorAll('a[href^="ws://" i]').forEach(a => wsHits.add(a.getAttribute('href')));
      if (wsHits.size > 0) {
        addVuln('Insecure WebSocket', 'High', `${wsHits.size} insecure WebSocket URL(s) (ws://) found on an HTTPS page: ${[...wsHits].slice(0, 3).join(', ')}. Traffic over ws:// is unencrypted, allowing on-path attackers to read or inject messages — and modern browsers will refuse the connection from a secure page.`, pageUrl, 'Switch every WebSocket URL to wss:// and ensure the server presents a valid TLS certificate. Keep ws:// only for local development on http://localhost.');
      }
    }
  } catch (e) {}

  // 32. Admin Endpoint Exposure (internal API references leaked in client code)
  try {
    const sources = [
      ...Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent || ''),
      Array.from(document.querySelectorAll('a[href], form[action]'))
        .map(el => (el.getAttribute('href') || el.getAttribute('action') || '')).join('\n')
    ].join('\n');
    const adminEndpointRe = /\b\/?api\/(admin|internal|debug|private|sudo|root|management|maintenance|sys|system)\/[a-z0-9_\-\/.]+/gi;
    const hits = new Set();
    let m;
    while ((m = adminEndpointRe.exec(sources)) !== null) hits.add(m[0].slice(0, 120));
    if (hits.size > 0) {
      addVuln('Admin Endpoint Exposure', 'High', `${hits.size} internal/admin API endpoint reference(s) found in client code: ${[...hits].slice(0, 3).join(', ')}. These paths should not be reachable by the public — leaking them in browser-visible JS makes them an obvious target.`, pageUrl, 'Remove admin/internal endpoint references from client-side JavaScript. Enforce authentication AND authorization on every such route server-side, and consider blocking the entire path at your edge / WAF for anything outside the office IP.');
    }
  } catch (e) {}

  // 33. Cloud Storage Reference (S3 / GCS / Azure Blob URLs in client code)
  try {
    const html = document.documentElement.innerHTML || '';
    const cloudRe = /\b((?:[a-z0-9-]+\.)?s3[.-][a-z0-9-]+\.amazonaws\.com\/[a-z0-9._\-\/]*|storage\.googleapis\.com\/[a-z0-9._\-\/]+|[a-z0-9-]+\.blob\.core\.windows\.net\/[a-z0-9._\-\/]*|[a-z0-9-]+\.r2\.cloudflarestorage\.com\/[a-z0-9._\-\/]*)/gi;
    const cloudHits = new Set();
    let m;
    while ((m = cloudRe.exec(html)) !== null) cloudHits.add(m[0].slice(0, 140));
    if (cloudHits.size > 0) {
      const suspicious = [...cloudHits].filter(u => /(backup|private|internal|staging|dev|test|secret|dump|export)/i.test(u));
      if (suspicious.length > 0) {
        addVuln('Cloud Storage Reference', 'Low', `${cloudHits.size} cloud storage URL(s) referenced; ${suspicious.length} contain suspicious words (backup/private/internal/staging): ${suspicious.slice(0, 3).join(', ')}. Verify the bucket is not publicly listable and contains only intended-public assets.`, pageUrl, "Confirm bucket policy is not public-readable for listing. On AWS S3, set 'Block Public Access' at the account level and use signed URLs for private content. On GCS / Azure / R2, the equivalent controls are 'Uniform bucket-level access' (GCS) and disabling anonymous reads.");
      } else {
        addVuln('Cloud Storage Reference', 'Low', `${cloudHits.size} cloud storage URL(s) referenced: ${[...cloudHits].slice(0, 3).join(', ')}. Verify the bucket is not publicly listable and contains only intended-public assets.`, pageUrl, "Confirm bucket policy is not public-readable for listing. On AWS S3, set 'Block Public Access' and prefer signed URLs for private content. On GCS / Azure / R2, the equivalent controls are 'Uniform bucket-level access' (GCS) and disabling anonymous reads.");
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
