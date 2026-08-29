// Baseera Security Scanner - Popup Script
// API/App URLs are loaded from chrome.storage at startup (configurable via Options page).
// Initial values mirror BASEERA_DEFAULTS in ../config.js so any code running
// before getBaseeraConfig() resolves still uses production URLs, not localhost.
let API_BASE_URL = 'https://baseera-api.runasp.net/api';
let APP_BASE_URL = 'https://baseera-three.vercel.app';

let scanResults = null;
let currentURL = '';
let scanCancelled = false;
let isAuthed = false;
let scanProgTimer = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof window.BaseeraConfig?.getBaseeraConfig === 'function') {
      const cfg = await window.BaseeraConfig.getBaseeraConfig();
      API_BASE_URL = cfg.apiBaseUrl;
      APP_BASE_URL = cfg.appBaseUrl;
    }
  } catch (e) {
    // Config read failed (service worker waking up); fall back to prod defaults.
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

  // Bind scan button (state 1 → start scan)
  document.getElementById('scan-btn').addEventListener('click', runScan);

  // Rescan is rendered dynamically in the results CTA (see displayResults).

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

  // Auth sync + status run LAST and are non-blocking: the buttons above are
  // already wired, so the popup stays fully usable even if the service worker
  // is still waking up or there is no Baseera tab open to sync from. The badge
  // flips to "logged in" once the sync resolves.
  try {
    await syncAuthFromWebsite();
    await checkAuthStatus();
  } catch (err) {
    // Best effort; UI stays usable and defaults to the guest state.
  }
}

function showState(state) {
  document.getElementById('state-idle').style.display = state === 'idle' ? 'block' : 'none';
  document.getElementById('state-scanning').style.display = state === 'scanning' ? 'block' : 'none';
  document.getElementById('state-results').style.display = state === 'results' ? 'block' : 'none';
}

async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'userName'], (result) => {
      isAuthed = !!result.authToken;
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
  resetScanRing();
  animateChecklist();
  animateScanProgress();

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
  // Snap the progress ring to 100% as the scan completes.
  clearInterval(scanProgTimer);
  const arc = document.getElementById('scan-ring-arc');
  const pct = document.getElementById('scan-ring-pct');
  if (arc) arc.style.strokeDashoffset = 0;
  if (pct) pct.textContent = '100%';
}

// Progress ring for the scanning state. The real scan is one executeScript
// call, so the % is a smooth fill over the animation floor that snaps to 100%
// the moment results are ready — the same feel as the website landing demo.
const SCAN_RING_C = 213.6; // 2*pi*34
function resetScanRing() {
  clearInterval(scanProgTimer);
  const arc = document.getElementById('scan-ring-arc');
  const pct = document.getElementById('scan-ring-pct');
  if (arc) arc.style.strokeDashoffset = SCAN_RING_C;
  if (pct) pct.textContent = '0%';
}
function animateScanProgress() {
  clearInterval(scanProgTimer);
  let p = 0;
  scanProgTimer = setInterval(() => {
    if (scanCancelled) { clearInterval(scanProgTimer); return; }
    p = Math.min(96, p + 4); // creep to ~96; completeChecklist snaps to 100
    const arc = document.getElementById('scan-ring-arc');
    const pct = document.getElementById('scan-ring-pct');
    if (pct) pct.textContent = p + '%';
    if (arc) arc.style.strokeDashoffset = SCAN_RING_C * (1 - p / 100);
    if (p >= 96) clearInterval(scanProgTimer);
  }, 55);
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

  // Real risk score (0-100), computed by the page scanners from the actual
  // findings. Rendered as a ring, matching the website dashboard + landing.
  const rs = Math.max(0, Math.min(100, results.riskScore || 0));
  const clean = vulns.length === 0;
  const C = 213.6; // 2*pi*34
  const off = C * (1 - rs / 100);
  const [col, label] = clean ? ['#00D9A5', 'No risk detected']
    : rs >= 70 ? ['#FF5C6B', 'Critical risk']
    : rs >= 40 ? ['#FF9840', 'High risk']
    : rs >= 20 ? ['#FFD60A', 'Elevated risk']
    : ['#00D4FF', 'Low risk'];

  const ring = `
    <div class="risk-ring">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r="34" fill="none" stroke="#16273f" stroke-width="8"/>
        <circle cx="52" cy="52" r="34" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 52 52)"/>
      </svg>
      <div class="risk-ring-v"><b style="color:${col}">${rs}</b><span>/ 100 risk</span></div>
    </div>`;

  const resultsCenter = document.getElementById('results-center');
  resultsCenter.innerHTML = `
    ${ring}
    <p class="result-main-title">${clean ? 'All clear' : 'Scan Completed'}</p>
    <p class="${clean ? 'result-main-subtitle--safe' : 'result-main-subtitle'}" style="color:${col}">${label}</p>
  `;

  if (clean) {
    document.getElementById('vuln-summary-card').style.display = 'none';
  } else {
    document.getElementById('vuln-summary-card').style.display = 'block';
    autoSaveResults();
  }

  // Results CTA differs for signed-in members vs guests (mirrors the website):
  // members get "saved to your dashboard" + view/rescan; guests get a locked
  // teaser that pushes sign-up.
  const total = critical + high + medium + low;
  const cta = document.getElementById('results-cta');
  if (clean) {
    cta.innerHTML = `<button class="cta-primary" data-act="rescan">Rescan page</button>`;
  } else if (isAuthed) {
    cta.innerHTML = `
      <div class="xsaved"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Scan saved to your dashboard</div>
      <button class="cta-primary" data-act="dashboard">View findings on dashboard</button>
      <button class="cta-ghost" data-act="rescan">Rescan</button>`;
  } else {
    cta.innerHTML = `
      <div class="xlock">
        <div class="xlock-lk"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
        <div class="xlock-t">${total} finding${total === 1 ? '' : 's'} on this page</div>
        <div class="xlock-s">Sign up to see what they are and how to fix them</div>
      </div>
      <button class="cta-primary" data-act="register">Sign up to view findings</button>
      <button class="cta-ghost" data-act="login">Already have an account? Sign in</button>`;
  }
  cta.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'rescan') runScan();
    else if (a === 'dashboard') chrome.tabs.create({ url: `${APP_BASE_URL}/bugs` });
    else if (a === 'register') chrome.tabs.create({ url: `${APP_BASE_URL}/register` });
    else if (a === 'login') chrome.tabs.create({ url: `${APP_BASE_URL}/login` });
  }));

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
          recommendation: v.recommendation || null,
          evidence: v.evidence || null
        }))
      })
    });
  } catch (err) {
    // Silent fail. Auto-save is best-effort; user can manually save later.
  }
}

// This function runs in the page context
async function runPageScanners(pageUrl) {
  const vulnerabilities = [];

  function addVuln(type, severity, description, location, recommendation, evidence) {
    vulnerabilities.push({
      type, severity, description,
      location: location || pageUrl,
      recommendation,
      evidence: evidence ? String(evidence).slice(0, 500) : null
    });
  }

  // Partially mask a secret so the finding *shows what leaked* (first + last
  // few chars) without splashing a live, fully-usable credential across the
  // dashboard and the database.
  function mask(s) {
    s = String(s);
    if (s.length <= 12) return s.slice(0, 3) + '****';
    return s.slice(0, 6) + '…' + s.slice(-4) + ` (${s.length} chars)`;
  }

  // Obvious placeholders / docs samples that are NOT real leaked secrets.
  function isPlaceholder(s) {
    const t = String(s).toLowerCase();
    if (/x{6,}/i.test(s) || /^(0{6,}|1{6,}|a{6,})/i.test(s)) return true;
    return /your[_-]?|example|sample|placeholder|dummy|test[_-]?key|changeme|<.*>|\.\.\./.test(t);
  }

  // Real HTTP response headers. A content script CANNOT read these from the
  // DOM, so the old meta-tag guesses fired on nearly every site: X-Frame-
  // Options and HSTS are header-only, browsers ignore their meta form, so the
  // "missing" check was ALWAYS true = a pure false positive. Here we fetch the
  // page once from the extension's isolated world (host permission bypasses
  // CORS) and read the genuine headers. If the fetch fails, we SKIP every
  // header finding rather than guess.
  let H = null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const resp = await fetch(pageUrl, { method: 'GET', credentials: 'include', redirect: 'follow', signal: ctl.signal });
    clearTimeout(timer);
    // If we were redirected off-origin (e.g. to a login page), the headers no
    // longer describe the page the user is looking at — don't trust them.
    let sameOrigin = true;
    try { sameOrigin = new URL(resp.url).origin === location.origin; } catch (e) {}
    if (sameOrigin) H = resp.headers;
  } catch (e) { H = null; }
  // hdr(name) -> header value string, '' if the header is absent, or null if
  // we could not read headers at all (caller must then skip the check).
  const hdr = (n) => H ? (H.get(n) || '') : null;

  // 1. XSS - dangerous patterns, javascript: URL, iframe srcdoc, reflected-parameter
  try {
    const scripts = document.querySelectorAll('script:not([src])');
    // Expanded patterns:
    //   eval(...), Function(...)                - dynamic code execution
    //   innerHTML = ..., outerHTML = ...        - HTML sink (incl. template literals)
    //   insertAdjacentHTML(...)                 - modern HTML sink, same risk as innerHTML
    //   document.write(...)                     - legacy HTML sink
    //   dangerouslySetInnerHTML                 - React's escape hatch, almost always smelly
    //   javascript:                             - URI scheme that executes code
    //   .html(...) / .append(...) / .prepend(...) - jQuery HTML sinks (when html-coerced)
    const dangerousPatterns = /\beval\s*\(|\bFunction\s*\(\s*["'`]|innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(|dangerouslySetInnerHTML|javascript:|(?:\$|jQuery)\([^)]*\)\.(?:html|append|prepend|after|before|replaceWith)\s*\(/i;
    scripts.forEach(s => {
      if (dangerousPatterns.test(s.textContent)) {
        addVuln('XSS', 'Medium', 'Potentially unsafe inline JavaScript patterns detected (eval/innerHTML/insertAdjacentHTML/document.write/dangerouslySetInnerHTML/jQuery .html()). This is a code-smell, not a confirmed XSS - review manually.', pageUrl, 'Avoid eval() and Function(). Use textContent instead of innerHTML. Replace jQuery .html(x) with .text(x). For React, escape user input rather than using dangerouslySetInnerHTML.');
      }
    });
    const jsUrls = document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]');
    if (jsUrls.length > 0) {
      addVuln('XSS', 'Critical', `Found ${jsUrls.length} element(s) using javascript: URLs (href/action).`, pageUrl, 'Avoid javascript: URLs. Bind click/submit handlers via addEventListener.');
    }
    // data:text/html URLs in src attributes are an HTML injection vector
    // very similar to iframe srcdoc - the data: payload renders as HTML
    // inside the embedding context.
    const dataHtmlSrcs = document.querySelectorAll('iframe[src^="data:text/html" i], embed[src^="data:text/html" i], object[data^="data:text/html" i]');
    if (dataHtmlSrcs.length > 0) {
      addVuln('XSS', 'High', `Found ${dataHtmlSrcs.length} element(s) loading data:text/html URLs. The data: payload is rendered as HTML in the embedding context, same risk as srcdoc.`, pageUrl, 'Avoid data:text/html in iframe/embed/object src. Serve the embedded content from a real same-origin URL or use sandbox attributes.');
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
      // Canonical link tag attribute also accepts unencoded reflection
      // and is then used by search-engine crawlers + bots; URL params
      // landing here are a real SEO + open-redirect surface.
      const canonicalHrefs = Array.from(document.querySelectorAll('link[rel*="canonical" i][href], link[rel*="alternate" i][href]'))
        .map(el => el.getAttribute('href') || '')
        .join('\n');
      const dangerousContext = inlineScripts + '\n' + handlerText + '\n' + jsHrefs + '\n' + srcAttrs + '\n' + canonicalHrefs;
      // High-confidence: URL param value lands inside an executable
      // context. This IS active XSS surface, flag at High.
      for (const v of values) {
        if (dangerousContext.indexOf(v) !== -1) {
          addVuln('Reflected XSS', 'High', 'A URL parameter value lands inside a dangerous context (inline script / event-handler attribute / javascript: URL / src attribute) without encoding. An attacker can craft a URL that injects script into this page.', pageUrl, 'HTML-encode user input before inserting into the DOM. Never echo URL parameters into <script> blocks, event-handler attributes, or src attributes without strict sanitisation.', `reflected value: "${v.slice(0, 80)}"`);
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

  // 2. SQL Injection - a real database error string leaking to the page.
  //    Tightened to vendor-specific signatures so the words "syntax error" in
  //    a blog or tutorial no longer fire. The matched snippet is the proof.
  try {
    const body = document.body?.innerText || '';
    const sqlErrors = /(SQL syntax.*(MySQL|MariaDB)|Warning:\s*mysqli?_|valid MySQL result|ORA-\d{5}|PostgreSQL.*ERROR|PG::[A-Za-z]+Error|Microsoft OLE DB Provider for (ODBC|SQL Server)|Unclosed quotation mark after the character string|quoted string not properly terminated|SQLite\/JDBCDriver|System\.Data\.SqlClient\.SqlException)/i;
    const m = body.match(sqlErrors);
    if (m) {
      addVuln('SQL Injection', 'Critical', 'A raw database error message is being returned to the browser. Verbose SQL errors confirm the query reaches the database unsanitised and hand an attacker a roadmap for injection.', pageUrl, 'Use parameterised queries / prepared statements, and return a generic error page instead of the database error.', m[0].slice(0, 180));
    }
  } catch (e) {}

  // 3. Command Injection - shell error output leaking to the page. Requires a
  //    real shell prompt prefix; bare "permission denied" (common in normal
  //    copy) no longer fires.
  try {
    const body = document.body?.innerText || '';
    const cmdErrors = /(\/bin\/(?:ba)?sh:\s|(?:^|\n)(?:ba)?sh:\s.*(?:command not found|No such file)|sh:\s+\d+:\s)/;
    const m = body.match(cmdErrors);
    if (m) {
      addVuln('Command Injection', 'Critical', 'Operating-system shell error output is visible in the page, which means user input is reaching a system shell.', pageUrl, 'Never pass user input to a shell. Use language-native APIs with argument arrays, and never echo command output to users.', m[0].trim().slice(0, 180));
    }
  } catch (e) {}

  // 4. Secret / API Key Exposure - classify secret vs publishable, show the
  //    actual (masked) value, and skip obvious placeholders. A publishable /
  //    browser key (Stripe pk_live, Google Maps AIza, Firebase apiKey) is
  //    DESIGNED to ship in client code, so flagging it Critical was noise; it
  //    is reported Low with a "restrict it" note instead.
  try {
    const html = document.documentElement.innerHTML;
    const SECRET = 'secret', PUBLIC = 'public';
    const patterns = [
      { regex: /AKIA[0-9A-Z]{16}/,                     name: 'AWS Access Key ID',            kind: SECRET },
      { regex: /sk-[A-Za-z0-9]{48}/,                   name: 'OpenAI API Key',               kind: SECRET },
      { regex: /sk_live_[0-9a-zA-Z]{24,}/,             name: 'Stripe Secret Key (live)',     kind: SECRET },
      { regex: /rk_live_[0-9a-zA-Z]{24,}/,             name: 'Stripe Restricted Key (live)', kind: SECRET },
      { regex: /ghp_[A-Za-z0-9]{36}/,                  name: 'GitHub Personal Access Token', kind: SECRET },
      { regex: /gho_[A-Za-z0-9]{36}/,                  name: 'GitHub OAuth Token',           kind: SECRET },
      { regex: /xox[baprs]-[0-9A-Za-z\-]{10,}/,        name: 'Slack Token',                  kind: SECRET },
      { regex: /SK[a-f0-9]{32}/,                       name: 'Twilio API Key',               kind: SECRET },
      { regex: /SG\.[\w\-]{22}\.[\w\-]{43}/,           name: 'SendGrid API Key',             kind: SECRET },
      { regex: /key-[0-9a-zA-Z]{32}/,                  name: 'Mailgun API Key',              kind: SECRET },
      { regex: /sq0(?:atp|csp)-[0-9A-Za-z\-_]{22,43}/, name: 'Square Access Token',          kind: SECRET },
      { regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, name: 'Private Key Block', kind: SECRET },
      { regex: /AccountKey=[A-Za-z0-9+/=]{40,}/,       name: 'Azure Storage Account Key',    kind: SECRET },
      { regex: /"type":\s*"service_account"/,          name: 'GCP Service Account JSON',     kind: SECRET },
      // Publishable / browser keys - meant to be public, but should be locked
      // down (HTTP referrer / domain / API restrictions).
      { regex: /pk_live_[0-9a-zA-Z]{24,}/,             name: 'Stripe Publishable Key (live)', kind: PUBLIC },
      { regex: /AIza[0-9A-Za-z\-_]{35}/,               name: 'Google API Key',                kind: PUBLIC },
      { regex: /firebase[^,]{0,30}apiKey[^,]{0,10}["']([A-Za-z0-9_\-]{20,})["']/i, name: 'Firebase Web API Key', kind: PUBLIC },
    ];
    const seen = new Set();
    patterns.forEach(p => {
      const m = html.match(p.regex);
      if (!m) return;
      const value = m[1] || m[0];
      if (isPlaceholder(value) || seen.has(value)) return;
      seen.add(value);
      if (p.kind === SECRET) {
        addVuln('Exposed Secret', 'Critical',
          `A ${p.name} is exposed in this page's source. This is a live credential an attacker can copy straight from "View Source" and use to reach your accounts, send mail, or move money.`,
          pageUrl,
          `Remove the ${p.name} from client-side code and keep it server-side. Rotate/revoke this key now - assume it is already compromised.`,
          `${p.name}: ${mask(value)}`);
      } else {
        addVuln('Publishable Key Exposure', 'Low',
          `A ${p.name} is present in the page. This key type is meant to be public, so it is not a leak by itself - but if it is not restricted, someone can reuse it under your quota/billing.`,
          pageUrl,
          `Lock this key down: for Google add HTTP-referrer + API restrictions in the Cloud console; for Stripe, publishable keys are safe on their own - just confirm no secret key sits beside it.`,
          `${p.name}: ${mask(value)}`);
      }
    });

    // JWTs are how virtually every SPA carries its session, so a JWT in the
    // page is normal, not a Critical leak. Surface it Low and decode the
    // header so the user sees the algorithm (alg:none / a weak alg is the real
    // issue worth chasing).
    const jwt = html.match(/eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{6,}/);
    if (jwt) {
      let detail = mask(jwt[0]);
      try {
        const head = JSON.parse(atob(jwt[0].split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
        const body = JSON.parse(atob(jwt[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = body.exp ? new Date(body.exp * 1000).toISOString().slice(0, 10) : 'no exp';
        detail = `alg=${head.alg}${body.iss ? ', iss=' + String(body.iss).slice(0, 40) : ''}, exp=${exp}`;
      } catch (e) {}
      addVuln('JWT in Page Source', 'Low',
        'A JSON Web Token is present in the page. This is common (session handling), but confirm it is a short-lived access token, not a long-lived secret, and that the signing algorithm is strong (never alg:none, or HS256 with a guessable key).',
        pageUrl,
        'Keep tokens short-lived, prefer HttpOnly cookies over JS-reachable HTML/localStorage, and verify the signature server-side with a strong algorithm.',
        detail);
    }
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

  // 6. Content-Security-Policy - evaluated from the REAL response header first
  //    (meta CSP as a fallback). Missing CSP = Medium; a CSP weakened by
  //    'unsafe-inline' / 'unsafe-eval' / wildcard = High (it exists but does
  //    not actually stop XSS). Skipped entirely when headers are unreadable
  //    AND no meta CSP is present, so we never guess.
  try {
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
    const metaVal = metaCSP ? (metaCSP.getAttribute('content') || '') : '';
    const headerCSP = hdr('content-security-policy'); // '' absent, null unreadable
    const haveKnowledge = headerCSP !== null || metaCSP;
    const csp = ((headerCSP || '') + ' ' + metaVal).trim();
    if (haveKnowledge) {
      if (!csp) {
        addVuln('Missing CSP', 'Medium', 'No Content-Security-Policy was served. CSP is the main defence-in-depth control that stops injected scripts from running; without it the page relies on output encoding alone.', pageUrl, 'Add a Content-Security-Policy response header restricting script-src, object-src and frame-ancestors. Start in report-only mode.', 'content-security-policy: (absent)');
      } else {
        const weak = [];
        if (/unsafe-inline/i.test(csp)) weak.push("'unsafe-inline'");
        if (/unsafe-eval/i.test(csp)) weak.push("'unsafe-eval'");
        // Bare "*" source only (a whitespace/quote-delimited * that is NOT the
        // start of a domain like *.cdn.com or https://*.example.com).
        if (/(?:script-src|default-src)[^;]*(?:\s|')\*(?![\w.\-])/i.test(csp)) weak.push('wildcard *');
        if (weak.length) {
          addVuln('Weak CSP', 'High', `A Content-Security-Policy is set but weakened by ${weak.join(', ')}, which lets injected inline / eval'd scripts run anyway - so it does not effectively block XSS.`, pageUrl, "Remove 'unsafe-inline' and 'unsafe-eval'; use nonces or hashes for the scripts you trust, and drop wildcard sources.", `weakened by ${weak.join(', ')}`);
        }
      }
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

  // 8. Clickjacking - real X-Frame-Options header OR CSP frame-ancestors.
  //    (The old meta[X-Frame-Options] check was meaningless: browsers ignore
  //    XFO in a meta tag, so it reported "missing" on every single site.)
  try {
    const xfo = hdr('x-frame-options');
    if (xfo !== null) { // headers readable
      const framed = /frame-ancestors/i.test(hdr('content-security-policy') || '');
      if (!xfo && !framed) {
        addVuln('Clickjacking', 'Medium', 'This page can be framed by any site: it sends neither X-Frame-Options nor a CSP frame-ancestors directive. An attacker can overlay it invisibly and trick users into clicking (clickjacking).', pageUrl, "Send X-Frame-Options: DENY (or SAMEORIGIN) and/or Content-Security-Policy: frame-ancestors 'self'.", 'x-frame-options: (absent), no frame-ancestors');
      }
    }
  } catch (e) {}

  // 9. Insecure Cookies - only flag session/auth-looking cookies that JS can
  //    read (missing HttpOnly). A JS-readable analytics/UI cookie is fine and
  //    was the source of a lot of noise here.
  try {
    if (document.cookie) {
      const names = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
      const risky = names.filter(n => /sess|sid|auth|token|jwt|login|remember|secret|csrf/i.test(n));
      if (risky.length > 0) {
        addVuln('Insecure Cookies', 'Medium', `${risky.length} session/auth-related cookie(s) can be read from JavaScript (no HttpOnly flag). If any XSS lands on this site, an attacker can steal these and hijack the session.`, pageUrl, 'Set HttpOnly (plus Secure and SameSite) on session and auth cookies so they are never exposed to page scripts.', risky.join(', '));
      }
    }
  } catch (e) {}

  // 10. Missing SRI - external scripts with no integrity hash. Defence-in-depth
  //     (supply-chain), so Low; the actual script URLs are the evidence.
  try {
    const ext = [];
    document.querySelectorAll('script[src]:not([integrity])').forEach(s => {
      const src = s.getAttribute('src') || '';
      if (src.startsWith('http') && !src.includes(window.location.hostname)) ext.push(src);
    });
    if (ext.length > 0) {
      addVuln('Missing SRI', 'Low', `${ext.length} external script(s) load without Subresource Integrity. If that third-party host is ever compromised, its code runs on your page with no integrity check to stop it.`, pageUrl, 'Add integrity="sha384-…" and crossorigin="anonymous" to external <script> tags, or self-host the file.', ext.slice(0, 3).join('  ,  '));
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
        addVuln('Open Redirect', 'Medium', `The URL parameter "${param}" holds a full external URL that the page may redirect to. If it is not validated, an attacker can craft a link on your domain that bounces users to a phishing site.`, pageUrl, 'Validate redirect targets against a server-side allow-list; reject absolute URLs and protocol-relative (//) values.', `${param}=${val.slice(0, 120)}`);
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
    // Pattern list groups (kept readable, joined with | for the regex engine):
    //   VCS metadata        - .git/, .svn/, .hg/, .gitignore, .gitattributes,
    //                         .gitmodules, .dockerignore
    //   Env / token rc      - .env, .htaccess, .htpasswd, .npmrc, .yarnrc, .aws/
    //   Container / infra   - Dockerfile, docker-compose.y(a)ml, Procfile,
    //                         terraform.tfstate, .terraform/
    //   TLS material        - *.pem, *.key, *.crt, *.p12, *.pfx, id_rsa, id_dsa
    //   OS / IDE junk       - .DS_Store, Thumbs.db, .idea/, .vscode/
    //   Backup / dump       - .bak, .old, .orig, .swp, core.dump, crash.log,
    //                         dump.sql, dump.tar, *backup*.(zip|tar|sql|gz)
    //   Build / lock files  - web.config, composer.lock, package-lock.json,
    //                         Gemfile.lock, Pipfile.lock, yarn.lock,
    //                         config.{php,json,yml,yaml,inc.php}
    //   Admin / debug paths - wp-admin, wp-config, phpmyadmin, phpinfo.php,
    //                         server-status, server-info, administrator,
    //                         admin-panel/cp/console
    //   API discovery       - swagger(-ui), api-docs, openapi.*, graphql,
    //                         graphiql, actuator, jolokia
    //   System paths        - cgi-bin, /bin, /sbin, /etc, /proc, /tmp
    //   Catch-all           - private/, internal/, intranet/, (backup|archive)/
    const patterns = /\/(\.git(\/|$)|\.gitignore|\.gitattributes|\.gitmodules|\.dockerignore|\.svn\/|\.hg\/|\.env(\.|$|\/)|\.htaccess|\.htpasswd|\.DS_Store|\.idea\/|\.vscode\/|\.aws\/|\.npmrc|\.yarnrc|\.terraform\/|Dockerfile($|\?)|docker-compose\.(yml|yaml)|Procfile($|\?)|terraform\.tfstate|\.bak|\.old|\.orig|\.swp|id_rsa|id_dsa|.+\.(pem|key|crt|p12|pfx)($|\?)|Thumbs\.db|wp-admin|wp-config|phpmyadmin|phpinfo\.php|server-status|server-info|web\.config|composer\.lock|package-lock\.json|Gemfile\.lock|Pipfile\.lock|yarn\.lock|database\.sql|config\.(php|json|yml|yaml|inc\.php)|admin(istrator)?(\/|$|\?|\.php)|admin[-_]?(panel|cp|console)(\/|$|\?)|swagger(-ui)?(\/|$|\?)|api-docs(\/|$|\?)|openapi(\.json|\.yaml|\/|$)|graphql(\/|$|\?)|graphiql(\/|$|\?)|actuator(\/|$|\?)|jolokia(\/|$|\?)|console(\/|$|\?)|(private|internal|intranet)(\/|$|\?)|(backup|backups|bak|old|archive)(\/|$|\?|\.)|.*(backup|dump)\.(zip|tar|tar\.gz|tgz|sql|gz)($|\?)|cgi-bin\/|\/bin(\/|$)|\/ws(\/|$)|\/sbin(\/|$)|\/etc(\/|$)|\/proc(\/|$)|\/tmp(\/|$)|\.svn\/wc\.db|\.git\/HEAD|\.git\/config|\.git\/index|core\.dump|crash\.log|dump\.sql|dump\.tar|robots\.txt\?|sitemap\.xml\?|wp-content\/(uploads|debug\.log)|node_modules\/|vendor\/|tests?\/|spec\/|fixtures?\/)/i;
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
      addVuln('Sensitive Files', 'High', `Found ${hits.length} reference(s) to potentially sensitive paths (VCS metadata, env/config, backups, admin or API-doc endpoints). If any of these are actually reachable, they can leak source code, credentials, or an attack surface.`, hits[0].slice(0, 200), 'Block these paths at the web server / WAF and remove backup and VCS files from production.', hits.slice(0, 3).map(h => h.slice(0, 100)).join('  ,  '));
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

  // 17. CORS Misconfiguration - from the real Access-Control-Allow-Origin
  //     header. Wildcard + credentials is the genuinely dangerous combination.
  try {
    const acao = hdr('access-control-allow-origin');
    if (acao) {
      const acac = (hdr('access-control-allow-credentials') || '').toLowerCase() === 'true';
      if (acao.trim() === '*' && acac) {
        addVuln('CORS Misconfiguration', 'High', 'The response sends Access-Control-Allow-Origin: * together with Access-Control-Allow-Credentials: true. Wherever that combination is honoured, another site can read this origin\'s authenticated responses.', pageUrl, 'Never combine a wildcard origin with credentials. Echo back a specific, allow-listed origin instead.', 'ACAO: *  +  ACAC: true');
      } else if (acao.trim() === '*') {
        addVuln('Permissive CORS', 'Low', 'Access-Control-Allow-Origin is set to * (any origin). Fine for genuinely public data; a problem if this endpoint ever returns anything user-specific.', pageUrl, 'Scope CORS to the specific origins that need it rather than *.', 'access-control-allow-origin: *');
      }
    }
  } catch (e) {}

  // 18. Missing HSTS - real header, https only. (Meta HSTS is ignored by
  //     browsers, so the old check fired on every site.) Defence-in-depth = Low.
  try {
    if (pageUrl.startsWith('https://')) {
      const hsts = hdr('strict-transport-security');
      if (hsts !== null && !hsts) {
        addVuln('Missing HSTS', 'Low', 'No Strict-Transport-Security header. Without HSTS, a first visit or an on-path attacker can downgrade the user to http:// and strip TLS.', pageUrl, 'Send Strict-Transport-Security: max-age=31536000; includeSubDomains (add preload once you are confident).', 'strict-transport-security: (absent)');
      }
    }
  } catch (e) {}

  // 19. Insecure localStorage usage (sensitive data)
  try {
    const lsKeys = Object.keys(localStorage);
    const sensitiveKeys = lsKeys.filter(k => /password|secret|token|api_key|apikey|credit|ssn|private/i.test(k));
    if (sensitiveKeys.length > 0) {
      addVuln('Insecure Storage', 'High', `localStorage holds key(s) whose names suggest sensitive data: ${sensitiveKeys.join(', ')}. localStorage is readable by any script on the page, so an XSS steals it instantly, and it persists on disk with no expiry.`, pageUrl, 'Do not keep secrets or session tokens in localStorage. Use HttpOnly cookies for sessions and keep secrets server-side.', sensitiveKeys.join(', '));
    }
  } catch (e) {}

  // 20. (Merged into section 6 - weak CSP is reported there from the real header.)

  // 21. Outdated JavaScript Libraries. Version is read from the script/link
  //     URL (e.g. jquery-3.4.1.min.js, jquery@3.4.1) so it works from the
  //     isolated content-script world, where page globals like window.jQuery
  //     are NOT visible. window.* globals are checked too as a bonus.
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
    const reported = new Set();
    const report = (name, version, minSafe, url) => {
      const key = name + version;
      if (reported.has(key)) return;
      reported.add(key);
      addVuln('Outdated Components', 'High',
        `${name} ${version} is older than the recommended ${minSafe}, so publicly documented CVEs for this version may apply.`,
        pageUrl,
        `Upgrade ${name} to ${minSafe} or later, and audit regularly with Retire.js, npm audit, or Snyk.`,
        `${name} ${version}${url ? ' — ' + url.slice(0, 90) : ''}`);
    };

    // URL-based detection (works in the isolated world).
    const srcs = [];
    document.querySelectorAll('script[src], link[href]').forEach(el => {
      const u = el.getAttribute('src') || el.getAttribute('href') || '';
      if (u) srcs.push(u);
    });
    const libRules = [
      { re: /jquery[.\-/@](\d+\.\d+\.\d+)/i,     name: 'jQuery',     min: '3.5.0',  bad: v => lt(v, '3.5.0') },
      { re: /angular[.\-/@](1\.\d+\.\d+)/i,      name: 'AngularJS',  min: '(migrate off - 1.x is end-of-life)', bad: () => true },
      { re: /lodash[.\-/@](\d+\.\d+\.\d+)/i,     name: 'lodash',     min: '4.17.21', bad: v => lt(v, '4.17.21') },
      { re: /bootstrap[.\-/@](\d+\.\d+\.\d+)/i,  name: 'Bootstrap',  min: '4.3.1',  bad: v => lt(v, '4.3.1') },
      { re: /vue[.\-/@](2\.\d+\.\d+)/i,          name: 'Vue',        min: '3.x (Vue 2 is end-of-life)', bad: () => true },
      { re: /moment[.\-/@](\d+\.\d+\.\d+)/i,     name: 'Moment.js',  min: 'a modern alternative (date-fns, dayjs, Luxon)', bad: () => true },
    ];
    srcs.forEach(u => {
      libRules.forEach(r => {
        const m = u.match(r.re);
        if (m && r.bad(m[1])) report(r.name, m[1], r.min, u);
      });
    });

    // window.* globals (only visible if this runs in the main world; harmless
    // otherwise).
    try { if (window.jQuery?.fn?.jquery && lt(window.jQuery.fn.jquery, '3.5.0')) report('jQuery', window.jQuery.fn.jquery, '3.5.0'); } catch (e) {}
    try { if (window.angular?.version?.full?.startsWith('1.')) report('AngularJS', window.angular.version.full, '(migrate off - 1.x is end-of-life)'); } catch (e) {}
    try { if (window._?.VERSION && lt(window._.VERSION, '4.17.21')) report('lodash', window._.VERSION, '4.17.21'); } catch (e) {}
    try { if (window.Vue?.version?.startsWith('2.')) report('Vue', window.Vue.version, '3.x (Vue 2 is end-of-life)'); } catch (e) {}
  } catch (e) {}

  // 22. DOM-based XSS Sinks (source → sink in inline scripts)
  //
  // Sources are values an attacker can influence via the URL or referrer
  // headers: location.hash, location.search, location.href, document.URL,
  // document.referrer, window.name, plus the hashchange event itself
  // (which exposes location.hash without an obvious `location.` reference
  // in the handler body).
  //
  // Sinks are grouped so the SAME source can taint multiple sink kinds
  // and the user gets the most accurate finding instead of "DOM XSS"
  // for everything:
  //   - HTML sinks       -> DOM-based XSS  (Critical/High)
  //   - Code-exec sinks  -> DOM-based XSS
  //   - jQuery sinks     -> DOM-based XSS  (huge legacy footprint)
  //   - Navigation sinks -> DOM-based XSS (renamed Open Redirect inside
  //                                        the description so users see why)
  //   - Cookie sinks     -> DOM-based XSS (renamed Cookie Manipulation
  //                                        inside the description)
  try {
    const scripts = document.querySelectorAll('script:not([src])');

    // Combined source pattern. hashchange listeners are an implicit source -
    // even if the handler body doesn't say `location.hash`, the lab pattern
    // is: addEventListener('hashchange', fn) where fn writes location.hash
    // into a sink. We treat the listener registration itself as a "source
    // is present" signal.
    const sourceRe = /\b(location\.(hash|search|href|pathname)|document\.(URL|documentURI|referrer|baseURI)|window\.name)\b|addEventListener\s*\(\s*["'`]hashchange["'`]/;

    // HTML sinks: anything that renders a string as HTML.
    const htmlSinkRe = /\b(innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|document\.write(?:ln)?\s*\(|dangerouslySetInnerHTML/;

    // Code-exec sinks: anything that runs a string as JavaScript.
    const codeSinkRe = /\beval\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]|\bFunction\s*\(\s*["'`]/;

    // jQuery DOM-XSS sinks. Covers .html(), .append(), .prepend(), .after(),
    // .before(), .replaceWith(), .attr('href'|'src', ...), .prop('href', ...).
    // The selector-itself pattern $(`...${x}...`) is the PortSwigger
    // hashchange lab - we catch that too with a template literal inside $().
    const jquerySinkRe = /(?:\$|jQuery)\s*\(\s*[`][^`]*\$\{|(?:\$|jQuery)\([^)]*\)\.(?:html|append|prepend|after|before|replaceWith)\s*\(|(?:\$|jQuery)\([^)]*\)\.(?:attr|prop)\s*\(\s*["'`](?:href|src|action|formaction)["'`]/;

    // Navigation sinks - DOM-based open redirect. The attacker controls
    // where the browser goes next.
    const navSinkRe = /\blocation\s*=|\blocation\.(href|assign|replace)\s*=|\blocation\.(assign|replace)\s*\(|\bwindow\.location\s*=|\bwindow\.open\s*\(/;

    // Cookie sinks - attacker can set arbitrary cookies via URL params.
    const cookieSinkRe = /\bdocument\.cookie\s*=/;

    let htmlHits = 0, codeHits = 0, jqueryHits = 0, navHits = 0, cookieHits = 0;

    scripts.forEach(s => {
      const code = s.textContent || '';
      if (!sourceRe.test(code)) return;
      if (htmlSinkRe.test(code))   htmlHits++;
      if (codeSinkRe.test(code))   codeHits++;
      if (jquerySinkRe.test(code)) jqueryHits++;
      if (navSinkRe.test(code))    navHits++;
      if (cookieSinkRe.test(code)) cookieHits++;
    });

    if (htmlHits > 0 || codeHits > 0 || jqueryHits > 0) {
      const total = htmlHits + codeHits + jqueryHits;
      const sinkTypes = [
        htmlHits   > 0 ? 'HTML sinks (innerHTML/document.write/insertAdjacentHTML/dangerouslySetInnerHTML)' : null,
        codeHits   > 0 ? 'code-exec sinks (eval/Function/string setTimeout)' : null,
        jqueryHits > 0 ? 'jQuery sinks (.html/.append/.attr(href)/$(template))' : null,
      ].filter(Boolean).join(', ');
      addVuln('DOM-based XSS', 'High', `${total} inline script(s) pipe an untrusted source (location.*, document.referrer, window.name, or a hashchange event) into ${sinkTypes}. An attacker controlling the URL can inject HTML or JavaScript.`, pageUrl, 'Treat location.*, document.referrer, hashchange events, and window.name as untrusted. Use textContent instead of innerHTML; never pass user input to eval/Function/setTimeout-string/setInterval-string; for jQuery, replace .html(x) with .text(x). Sanitize via DOMPurify if HTML rendering is unavoidable.');
    }

    if (navHits > 0) {
      addVuln('DOM-based XSS', 'High', `${navHits} inline script(s) assign an untrusted URL source (location.*, document.referrer, or window.name) into a navigation sink (location, window.location, window.open). This is a DOM-based open-redirect surface and may also enable javascript:-URL XSS.`, pageUrl, 'Validate redirect targets against an allow-list before assigning to location/window.open. Reject any value starting with "javascript:", "data:", or that does not match a known same-origin path.');
    }

    if (cookieHits > 0) {
      addVuln('DOM-based XSS', 'High', `${cookieHits} inline script(s) write a value derived from location/referrer/window.name into document.cookie. An attacker controlling the URL can set arbitrary cookies, including overriding session cookies (cookie manipulation / fixation).`, pageUrl, 'Never derive cookie values from URL fragments or query parameters. Set cookies server-side with HttpOnly + Secure + SameSite, and use a fixed allow-list of cookie names that client code is permitted to write.');
    }
  } catch (e) {}

  // 23. Insecure postMessage (listener without origin check)
  //
  // The base case is "page registers a message listener without checking
  // event.origin". On top of that we now flag two specific exploitable
  // chains - PortSwigger's "DOM XSS via web messages" and "via web messages
  // + JSON.parse" labs - where the message data flows straight into a
  // dangerous sink. Both still report under "Insecure postMessage" so the
  // Bugs page stays tidy, but the description tells the user the chain.
  try {
    const listenerRe = /addEventListener\s*\(\s*["'`]message["'`]/;
    const originRe   = /\b(e|ev|evt|event|msg)\.origin\b/;
    // Sinks downstream of the message event:
    //   HTML  = innerHTML / outerHTML / document.write / insertAdjacentHTML
    //   Nav   = location = / location.href = / window.open(
    //   Code  = eval / Function / string-setTimeout / setInterval
    const sinkRe = /\b(innerHTML|outerHTML)\s*=|document\.write\s*\(|insertAdjacentHTML\s*\(|\blocation\s*=|\blocation\.(href|assign|replace)\s*=|\bwindow\.open\s*\(|\beval\s*\(|\bFunction\s*\(\s*["'`]|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]/;
    // JSON.parse on the message data is a strong signal of the
    // "messages + JSON.parse" pattern even when the sink is in a
    // helper function we can't follow.
    const jsonParseRe = /JSON\.parse\s*\(\s*(?:e|ev|evt|event|msg)\.data\b/;

    const scripts = document.querySelectorAll('script:not([src])');
    let noOriginHits = 0;
    let sinkChainHits = 0;
    let jsonParseHits = 0;

    scripts.forEach(s => {
      const code = s.textContent || '';
      if (!listenerRe.test(code)) return;
      const hasOriginCheck = originRe.test(code);
      if (!hasOriginCheck) noOriginHits++;
      // Sink chain is interesting EVEN when origin is checked - origin
      // checks can be weak (startsWith / includes / regex bypass), so
      // having a dangerous sink downstream is worth surfacing on its own.
      if (sinkRe.test(code))      sinkChainHits++;
      if (jsonParseRe.test(code)) jsonParseHits++;
    });

    if (noOriginHits > 0) {
      addVuln('Insecure postMessage', 'High', `${noOriginHits} 'message' event listener(s) do not verify event.origin. Any iframe (including attacker-controlled ones) can deliver crafted payloads.`, pageUrl, 'Always validate event.origin against an allow-list inside message handlers; never trust the payload blindly.');
    }
    if (sinkChainHits > 0) {
      addVuln('Insecure postMessage', 'High', `${sinkChainHits} 'message' event listener(s) feed event.data into a dangerous sink (innerHTML / document.write / location / eval / window.open / setTimeout-string). This is the PortSwigger "DOM XSS via web messages" pattern - an attacker who can postMessage to this window can inject HTML, navigate the user, or execute code.`, pageUrl, 'Never write event.data into HTML / location / eval sinks without strict validation. Validate event.origin AND sanitize the payload (treat it as untrusted user input). For HTML rendering, use textContent or a sanitiser like DOMPurify.');
    }
    if (jsonParseHits > 0) {
      addVuln('Insecure postMessage', 'High', `${jsonParseHits} 'message' event listener(s) call JSON.parse(event.data) and then use the result. The PortSwigger "DOM XSS via web messages + JSON.parse" pattern: parsed properties are dispatched to sinks (e.g. innerHTML = parsed.html) - an attacker postMessage'ing a crafted JSON object controls those properties.`, pageUrl, 'Validate event.origin BEFORE JSON.parse, then validate every property of the parsed object against an expected shape. Never trust property names or values to be safe just because the JSON parsed successfully.');
    }
  } catch (e) {}

  // 24. Session / Token in URL
  try {
    const url = String(pageUrl || location.href);
    const m = url.match(/[?&#](jsessionid|phpsessid|sid|sessionid|token|access_token|id_token|auth|apikey|api_key)=([^&#]{4,})/i);
    if (m) {
      addVuln('Session Token in URL', 'High', 'A session or authentication token is being carried in the URL. URLs leak into browser history, proxy and server logs, and the Referer header sent to third parties - so this token can be captured and replayed.', pageUrl, 'Move tokens into the Authorization header or an HttpOnly cookie; never place them in query strings or fragments.', `${m[1]}=${mask(m[2])}`);
    }
  } catch (e) {}

  // 25. Hardening Headers - from the REAL response headers (defence-in-depth,
  //     so Low). Skipped when headers are unreadable, so no guessing.
  try {
    const checks = [
      { h: 'x-content-type-options', name: 'X-Content-Type-Options', rec: 'Send X-Content-Type-Options: nosniff to stop MIME sniffing.' },
      { h: 'referrer-policy', name: 'Referrer-Policy', rec: 'Send Referrer-Policy: strict-origin-when-cross-origin (or stricter).' },
      { h: 'permissions-policy', name: 'Permissions-Policy', rec: 'Send Permissions-Policy to switch off camera/microphone/geolocation you do not use.' },
    ];
    checks.forEach(c => {
      const v = hdr(c.h);
      if (v !== null && !v) {
        addVuln(`Missing ${c.name}`, 'Low', `No ${c.name} header (defence-in-depth hardening, not a direct vulnerability).`, pageUrl, c.rec, `${c.h}: (absent)`);
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
      addVuln('Source Map Exposure', 'Medium', `Source map reference(s) detected. If the .map files are reachable, they reconstruct your original, unminified source code - including comments, internal paths, and any secrets left in it.`, pageUrl, 'Do not ship .map files to production, or block them at the web server. Generate source maps privately for your own debugging only.', [...maps].slice(0, 3).join('  ,  '));
    }
  } catch (e) {}

  // 27. (Removed — Sensitive Autocomplete contradicted NIST 800-63B guidance,
  // which now favours password-manager autofill rather than discouraging it.)


  // 28. Server / Technology Version Disclosure - prefer the REAL Server and
  //     X-Powered-By headers, then fall back to body banners / meta generator.
  try {
    const findings = [];
    const server = hdr('server');
    const xpb = hdr('x-powered-by');
    if (server && /\d/.test(server)) findings.push(`Server: ${server.slice(0, 80)}`);
    if (xpb) findings.push(`X-Powered-By: ${xpb.slice(0, 80)}`);
    const gen = document.querySelector('meta[name="generator" i]');
    if (gen) { const v = gen.getAttribute('content') || ''; if (v.trim()) findings.push(`generator: ${v.slice(0, 80)}`); }
    const html = document.documentElement.innerHTML;
    [/WordPress\s*\d+(\.\d+)+/i, /Drupal\s*\d+(\.\d+)+/i, /Joomla!?\s*\d+(\.\d+)+/i, /phpMyAdmin\s+\d+(\.\d+)+/i, /Apache\/\d+(\.\d+)+/i, /nginx\/\d+(\.\d+)+/i]
      .forEach(re => { const m = html.match(re); if (m) findings.push(m[0].slice(0, 80)); });
    const uniq = [...new Set(findings)];
    if (uniq.length > 0) {
      addVuln('Version Disclosure', 'Low', `Software versions are being advertised: ${uniq.slice(0, 3).join('; ')}. Exact version numbers let an attacker look up known CVEs for that precise build.`, pageUrl, 'Strip version numbers from the Server / X-Powered-By headers and remove the generator meta tag.', uniq.slice(0, 3).join('  ;  '));
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
      addVuln('External Form Action', hasPassword ? 'High' : 'Medium', `${external.length} form(s) submit to a different origin${hasPassword ? ', and at least one contains a password field - credentials would be posted off-site' : ''}. If the external target is attacker-controlled or compromised, submitted data goes straight to them.`, pageUrl, 'Only submit sensitive forms to your own backend. If an external action is intentional, verify it over HTTPS and document the dependency.', external.slice(0, 3).join('  ,  '));
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
        addVuln('Insecure WebSocket', 'High', `${wsHits.size} insecure WebSocket URL(s) (ws://) found on an HTTPS page. Traffic over ws:// is unencrypted, letting on-path attackers read or inject messages - and modern browsers will refuse the connection from a secure page.`, pageUrl, 'Switch every WebSocket URL to wss:// with a valid TLS certificate. Keep ws:// only for local development on http://localhost.', [...wsHits].slice(0, 3).join('  ,  '));
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
      addVuln('Admin Endpoint Exposure', 'High', `${hits.size} internal/admin API endpoint reference(s) found in client code. These paths should not be advertised to the public - leaking them in browser-visible JS hands an attacker an exact map of your privileged routes to probe.`, pageUrl, 'Remove admin/internal endpoint references from client-side JavaScript, enforce auth AND authorization on every such route server-side, and consider blocking the path at your edge / WAF outside trusted IPs.', [...hits].slice(0, 3).join('  ,  '));
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
        addVuln('Cloud Storage Reference', 'Low', `${cloudHits.size} cloud storage URL(s) referenced; ${suspicious.length} contain suspicious words (backup/private/internal/staging). Verify the bucket is not publicly listable and holds only intended-public assets.`, pageUrl, "Confirm the bucket is not public-readable for listing. On AWS S3, enable 'Block Public Access' and use signed URLs for private content; on GCS / Azure / R2 use 'Uniform bucket-level access' (GCS) and disable anonymous reads.", suspicious.slice(0, 3).join('  ,  '));
      } else {
        addVuln('Cloud Storage Reference', 'Low', `${cloudHits.size} cloud storage URL(s) referenced. Verify the bucket is not publicly listable and holds only intended-public assets.`, pageUrl, "Confirm the bucket is not public-readable for listing. On AWS S3, enable 'Block Public Access' and prefer signed URLs; on GCS / Azure / R2 use 'Uniform bucket-level access' (GCS) and disable anonymous reads.", [...cloudHits].slice(0, 3).join('  ,  '));
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
