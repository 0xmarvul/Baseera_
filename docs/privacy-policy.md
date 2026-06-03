---
layout: default
title: Privacy Policy — Baseera Security Scanner
---

# Privacy Policy — Baseera Security Scanner

**Effective Date:** 22 April 2026
**Last Updated:** 22 April 2026
**Contact:** marwankhodair0@gmail.com

This Privacy Policy describes how the **Baseera Security Scanner** Chrome
extension (the "Extension") collects, uses, stores, and shares information
when you use it. By installing and using the Extension you agree to the
practices described below.

---

## 1. What the Extension Does

Baseera is a **passive** web vulnerability scanner. When you click "Start
Scan" on a webpage, the Extension reads the page's DOM (HTML, scripts,
forms, headers exposed to JavaScript) to detect security weaknesses such
as cross-site scripting, SQL injection patterns, leaked API keys, missing
security headers, and 24 other vulnerability classes. The scan is
**user-initiated only** — no automatic background scanning occurs.

---

## 2. Information We Collect

### 2.1 Information stored locally on your device

The Extension stores the following data in `chrome.storage.local`, which
**never leaves your device** unless you explicitly log into a Baseera
account (see § 2.2):

- **Authentication token** — only when you sign in to a Baseera account.
- **Display name / email** — used to greet you in the popup.
- **Configured backend URLs** — set on the Options page.
- **Recent scan results** — stored temporarily so the popup can re-open
  to the last scan.

### 2.2 Information sent to the Baseera backend (only if you sign in)

If you are signed in, completed scan results are sent over HTTPS to the
Baseera backend you have configured, so they appear in your Bugs
Dashboard. Each transmitted record contains:

- The URL that was scanned.
- The list of detected vulnerability findings (type, severity, location,
  recommendation, evidence snippet).
- The timestamp of the scan.
- Your authentication token (in the `Authorization` header).

**If you are not signed in, nothing is sent to any server.** All scanning
runs entirely on your device.

### 2.3 Information we do NOT collect

We do **not** collect, transmit, sell, or share any of the following:

- Personally identifiable information beyond the email you registered with.
- Health, financial, or payment information.
- Location data.
- Personal communications, contacts, or calendar data.
- Web history beyond URLs you have explicitly chosen to scan.
- Browsing data on pages you do not actively scan.
- Information for advertising or analytics tracking.

---

## 3. How Information Is Used

Information collected by the Extension is used **only** to:

- Render scan results in the Extension popup.
- Display your scan history in the Baseera Bugs Dashboard (signed-in users).
- Power the in-app AI assistant that answers questions about detected
  vulnerabilities. Vulnerability data sent to the assistant is the same
  data already stored in your dashboard; no additional data is collected.
- Authenticate you to the Baseera backend.

We do **not** use your data for advertising, profiling, resale, or any
purpose unrelated to the single purpose of the Extension (passive
vulnerability scanning).

---

## 4. Data Storage and Security

- All data transmitted to the Baseera backend is sent over **HTTPS**
  (TLS 1.2+).
- Authentication tokens are stored in `chrome.storage.local`, sandboxed
  per-extension by Chrome.
- Scan results stored server-side are protected by access controls tied
  to your Baseera account.
- We never share, sell, or transfer your data to third parties for
  marketing or advertising.

---

## 5. Third-Party Services

The Extension does **not** include third-party analytics, advertising,
crash reporting, or tracking SDKs. The only network destination the
Extension contacts is the Baseera backend URL you have configured (and
optionally `fonts.googleapis.com` to load the popup font — no personally
identifiable information is sent in those requests).

---

## 6. Permissions Explained

The Extension requests these Chrome permissions:

| Permission | Why we need it |
|---|---|
| `activeTab` | To run scanners against the tab you choose to scan. |
| `scripting` | To execute scanner functions inside the active tab's DOM. |
| `storage` | To remember your login, settings, and recent results locally. |
| `tabs` | To read the URL of the active tab and open the dashboard. |
| `<all_urls>` (host permission) | Baseera is a security scanner — it must be able to run on any site you choose to scan. Scanning is always user-initiated. |

---

## 7. Your Choices and Rights

- **Stop sending scan results to the backend:** sign out of the Extension.
  All future scans will be local-only.
- **Delete stored scan history:** delete your Baseera account from the
  web dashboard, or contact us at the email below to request deletion.
- **Uninstall:** removing the Extension from Chrome deletes all locally
  stored data (`chrome.storage.local`) immediately.
- **Right to access / delete (GDPR / CCPA):** email the contact address
  below and we will respond within 30 days.

---

## 8. Children's Privacy

The Extension is not directed at children under 13 and we do not knowingly
collect data from children under 13.

---

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes
will be reflected by updating the "Last Updated" date at the top. Continued
use of the Extension after changes constitutes acceptance.

---

## 10. Contact

Questions, concerns, or data-access requests:

- **Email:** marwankhodair0@gmail.com
- **Project repository:** [github.com/0xMarvul/Baseera](https://github.com/0xMarvul/Baseera)

---

*Baseera is an academic / graduation-project software project. This
extension is provided "as is" without warranty of any kind.*
