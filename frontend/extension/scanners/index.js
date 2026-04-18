// Baseera Security Scanner - Scanners Index
// Note: The scanner functions are executed in the page context via chrome.scripting.executeScript
// This file serves as a registry of available scanners

const SCANNER_LIST = [
  { id: 'xss', name: 'XSS Detection', severity: 'Critical', file: 'xss.js' },
  { id: 'sql-injection', name: 'SQL Injection', severity: 'Critical', file: 'sql-injection.js' },
  { id: 'command-injection', name: 'Command Injection', severity: 'Critical', file: 'command-injection.js' },
  { id: 'api-keys', name: 'API Keys Exposure', severity: 'Critical', file: 'api-keys.js' },
  { id: 'insecure-forms', name: 'Insecure Forms', severity: 'Critical', file: 'insecure-forms.js' },
  { id: 'csp', name: 'Missing/Weak CSP', severity: 'High', file: 'csp.js' },
  { id: 'sensitive-files', name: 'Sensitive Files', severity: 'High', file: 'sensitive-files.js' },
  { id: 'mixed-content', name: 'Mixed Content', severity: 'Medium', file: 'mixed-content.js' },
  { id: 'hsts', name: 'Missing HSTS', severity: 'Medium', file: 'hsts.js' },
  { id: 'clickjacking', name: 'Clickjacking', severity: 'Medium', file: 'clickjacking.js' },
  { id: 'cookies', name: 'Insecure Cookies', severity: 'Medium', file: 'cookies.js' },
  { id: 'sri', name: 'Missing SRI', severity: 'Medium', file: 'sri.js' },
  { id: 'cors', name: 'CORS Issues', severity: 'Medium', file: 'cors.js' },
  { id: 'debug-pages', name: 'Debug Pages', severity: 'Medium', file: 'debug-pages.js' },
  { id: 'open-redirect', name: 'Open Redirect', severity: 'Medium', file: 'open-redirect.js' },
  { id: 'csrf', name: 'CSRF', severity: 'Medium', file: 'csrf.js' },
  { id: 'deprecated-html', name: 'Deprecated HTML', severity: 'Low', file: 'deprecated-html.js' },
  { id: 'trackers', name: 'Excessive Trackers', severity: 'Low', file: 'trackers.js' },
  { id: 'insecure-storage', name: 'Insecure Storage', severity: 'High', file: 'insecure-storage.js' },
  { id: 'weak-csp', name: 'Weak CSP', severity: 'High', file: 'weak-csp.js' },
  { id: 'outdated-libs', name: 'Outdated Components', severity: 'High', file: 'outdated-libs.js' },
  { id: 'dom-xss-sinks', name: 'DOM-based XSS', severity: 'High', file: 'dom-xss-sinks.js' },
  { id: 'postmessage-unsafe', name: 'Insecure postMessage', severity: 'High', file: 'postmessage-unsafe.js' },
  { id: 'session-in-url', name: 'Session Token in URL', severity: 'High', file: 'session-in-url.js' },
  { id: 'missing-headers', name: 'Missing Security Headers', severity: 'Medium', file: 'missing-headers.js' },
  { id: 'source-maps', name: 'Source Map Exposure', severity: 'Medium', file: 'source-maps.js' },
  { id: 'autocomplete-sensitive', name: 'Sensitive Autocomplete', severity: 'Medium', file: 'autocomplete-sensitive.js' },
  { id: 'form-external-action', name: 'External Form Action', severity: 'Medium', file: 'form-external-action.js' },
  { id: 'server-banner', name: 'Version Disclosure', severity: 'Low', file: 'server-banner.js' }
];
