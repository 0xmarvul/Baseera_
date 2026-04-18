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
  { id: 'weak-csp', name: 'Weak CSP', severity: 'High', file: 'weak-csp.js' }
];
