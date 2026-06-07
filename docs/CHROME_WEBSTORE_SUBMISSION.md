# Chrome Web Store Submission — Baseera Security Scanner

Everything you need to paste into the developer dashboard. Work through
this top-to-bottom; each section maps to a field or step in the upload
flow at <https://chrome.google.com/webstore/devconsole>.

---

## ⛔ Pre-flight blocker

The extension currently defaults to `localhost` URLs. Before the
extension is useful to anyone but you, you must either:

1. **Deploy the backend + frontend to a public HTTPS URL**, then have
   users set those URLs on the Extension's Options page after install
   (this works today — the Options page is wired in), OR
2. **Hardcode your production URLs** in `frontend/extension/config.js`
   once you have them.

You can still **upload** the extension now and pass review with the
"users configure their own URL on first run" model — many security
extensions work this way. Just make sure the listing copy below
explains it.

---

## 1. Developer account

- Visit <https://chrome.google.com/webstore/devconsole>
- Sign in with the Google account that will own the listing.
- Pay the **one-time $5 USD** registration fee.
- Set your **public developer name** (this appears on the listing — use
  "Marwan Khodair" or "Baseera").

---

## 2. Build the upload ZIP

From the repo root, on Windows PowerShell:

```powershell
Compress-Archive -Path frontend\extension\* -DestinationPath baseera-extension-v1.0.0.zip -Force
```

That ZIP is what you upload. Keep it under 2 GB (we're well under).

---

## 3. Store Listing tab — paste these

### Product name (45 chars max)
```
Baseera Security Scanner
```

### Short description (132 chars max)
```
Passive web vulnerability scanner. Detects XSS, SQL injection, leaked secrets, weak headers, and 24 more issues — instantly.
```

### Detailed description
```
Baseera Security Scanner is a passive, privacy-respecting vulnerability
scanner for the modern web. It analyses the page you are visiting and
reports security issues in seconds — without sending any requests, without
modifying the page, and without tracking you.

🛡️ WHAT IT DETECTS (31 scanners across 4 severity tiers)

CRITICAL
• Cross-Site Scripting via javascript: URLs
• SQL Injection error patterns
• Command Injection error patterns
• Exposed API keys & secrets (OpenAI, Stripe, AWS, JWT, private keys…)
• Insecure forms submitting passwords over HTTP

HIGH
• Weak Content Security Policy (unsafe-inline / unsafe-eval / wildcards)
• Sensitive files exposed (.env, .git, .DS_Store, backups, admin panels)
• Insecure client-side storage (passwords/tokens in localStorage)
• Outdated JavaScript libraries (jQuery, AngularJS, lodash, Bootstrap)
• DOM-based XSS sinks (location → innerHTML / eval)
• Insecure postMessage handlers (missing origin check)
• Session tokens in URLs
• Reflected XSS in a dangerous context (script / handler / src)
• iframe srcdoc HTML injection surface
• External form action submitting passwords
• Insecure WebSocket (ws://) on HTTPS pages
• Admin/internal API endpoint references in client code

MEDIUM
• Missing Content Security Policy
• XSS code-smell (eval/innerHTML/document.write)
• Mixed content
• Missing HSTS
• Clickjacking risk (missing X-Frame-Options)
• Insecure cookies (missing HttpOnly)
• Missing Subresource Integrity (SRI)
• CORS misconfiguration (wildcard)
• Debug pages exposed
• Open redirects
• CSRF token gaps
• Source map exposure
• Directory listing enabled
• External form action (no password)

LOW
• Inline event handlers (CSP bypass surface)
• Excessive 3rd-party trackers (5+ scripts)
• Version disclosure (X-Powered-By / generator tags)
• Cloud storage references with suspicious bucket names
• Missing X-Content-Type-Options / Permissions-Policy / COOP / Referrer-Policy

🤖 BUILT-IN AI ASSISTANT
Ask Baseera what any finding means and how to fix it. The assistant
explains every vulnerability class in plain language and gives
remediation steps.

🔒 PRIVACY-FIRST
• Scans run entirely on your device.
• No background scanning — you click "Scan" to start.
• No third-party analytics, ads, or trackers.
• Scan results are sent to the Baseera dashboard ONLY if you sign in.

⚙️ HOW TO USE
1. Install the extension.
2. (Optional) Right-click the icon → Options → set your Baseera backend
   URL if you are running your own instance.
3. Visit any site, click the Baseera icon, click "Start Scan".
4. Review findings by severity. Click the AI button to ask follow-up
   questions.

Baseera is built to make web security review accessible to every
developer, free and open. Feedback welcome at 0xbaseera@gmail.com.
```

### Category
**Developer Tools** (primary). Secondary: **Productivity**.

### Language
**English** (United States)

---

## 4. Privacy Practices tab — paste these

### Single purpose
```
Passively scan the website the user is visiting for security vulnerabilities and display the findings.
```

### Permission justifications

| Field | What to paste |
|---|---|
| `activeTab` | Required to inject passive DOM-reading scanners into the user's currently active tab when they explicitly click "Start Scan". |
| `storage` | Stores scan history, user preferences, configured backend URLs, and the authentication token locally so the user does not re-login each session. |
| `scripting` | Used with `chrome.scripting.executeScript` to run 31 passive vulnerability scanners against the active tab's DOM. No third-party code is injected. |
| `tabs` | Needed to read the current tab's URL for scan tracking and to query the active tab when the popup opens. |
| `<all_urls>` host permission | Baseera is a security scanner — to be useful it must run on any website the user chooses to scan. Scanning is always user-initiated; the extension does not access pages in the background. |
| `remote code` | **NOT USED.** All scanner code ships inside the extension package. Tick "No, I am not using remote code". |

### Data usage disclosure (tick these boxes)

The extension **DOES** handle:
- ✅ **Authentication information** (your JWT login token, only if you sign in)
- ✅ **Website content** (DOM contents of pages the user explicitly scans)
- ✅ **User activity** (the URLs you have chosen to scan, stored locally and synced to your dashboard if signed in)

The extension **DOES NOT** handle:
- ❌ Personally identifiable information (beyond the email you registered with)
- ❌ Health information
- ❌ Financial / payment information
- ❌ Personal communications
- ❌ Location
- ❌ Web history (passive browsing)

### Three required certifications (must tick all)

- ✅ I do not sell or transfer user data to third parties for purposes
  unrelated to the item's single purpose.
- ✅ I do not use or transfer user data for purposes that are unrelated
  to the item's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or
  for lending purposes.

### Privacy Policy URL
```
https://0xMarvul.github.io/Baseera/privacy-policy.html
```

> ⚠️ This URL only works after you enable GitHub Pages on the
> `Baseera` repo. Steps:
> 1. Push the new `docs/` folder to GitHub.
> 2. Go to repo Settings → Pages.
> 3. Source = "Deploy from a branch", Branch = `main`, Folder = `/docs`.
> 4. Wait ~60 seconds. Verify the URL loads.
> 5. Then paste it into the dashboard.

---

## 5. Distribution tab

- **Visibility:** Public
- **Geographic distribution:** All regions
- **Pricing:** Free
- **Mature content:** No

---

## 6. Assets you still need to make

These are the only things I can't generate for you — they require image
editing.

### Required

| Asset | Spec | Notes |
|---|---|---|
| 128×128 extension icon | PNG | ✅ You already have `frontend/extension/icons/icon128.png` |
| **440×280 small promo tile** | PNG or JPEG | ❌ MAKE THIS. Use Figma, Canva, or Photoshop. Should show the Baseera logo + the tagline "Passive web vulnerability scanner". |
| **1280×800 screenshots ×3–5** | PNG or JPEG | ❌ Capture these from your running extension: <br>(1) popup with scan results,<br>(2) Bugs Dashboard,<br>(3) AI assistant answering "What is XSS?",<br>(4) Options page,<br>(5) extension icon active in toolbar. |

### Optional (but nice)

| Asset | Spec |
|---|---|
| 1400×560 marquee promo tile | PNG/JPEG, only shown if Google features you |

**Tip on screenshots:** use Chrome at exactly 1280×800 (DevTools →
Device Toolbar → Responsive 1280×800), then full-page screenshot with
the Chrome built-in command palette (Ctrl+Shift+P → "Capture
screenshot"). Avoid showing real user emails or real production data.

---

## 7. Final pre-submission checklist

- [ ] `manifest.json` version is `1.0.0`
- [ ] Privacy policy is live and publicly accessible
- [ ] Tested the extension by loading the unpacked `frontend/extension/`
      folder in Chrome (`chrome://extensions` → Developer mode → Load
      unpacked) — confirm:
  - [ ] Popup opens
  - [ ] Scan runs and shows findings on a known-vulnerable test page
  - [ ] Options page opens via right-click icon → "Options"
  - [ ] Backend URL configured on Options page actually gets used by the popup
- [ ] All 4 store listing screenshots match what the extension actually does
- [ ] Author name in `manifest.json` matches your developer account public name
- [ ] ZIP archive created and is under 2 GB
- [ ] No `console.log` debug spam in `popup.js` / `background.js` /
      `content.js` (already cleaned)
- [ ] You agreed to the Chrome Web Store Developer Agreement

---

## 8. Submit

1. Dashboard → "New item" → upload the ZIP
2. Fill in every tab using the copy above
3. Upload the 4 screenshots + 1 promo tile
4. Click **Submit for review**
5. Approval usually arrives in 1–7 days. You'll get an email either way.

If rejected, the email tells you exactly which policy you tripped — fix
it, re-upload the ZIP with the same version, re-submit. No new fee.

---

## 9. After approval

- The listing URL becomes `https://chromewebstore.google.com/detail/<id>`
- Share it on your CV / graduation report / LinkedIn
- For updates, bump `version` in `manifest.json`, re-zip, re-upload.
- Add the listing badge to your GitHub README.

Good luck with the defense! 🚀
