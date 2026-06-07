// CSP Scanner. Missing CSP is Medium (OWASP-aligned, defence-in-depth gap).
// Weak CSP — directives like 'unsafe-inline' or wildcards — is reported by
// the separate weak-csp.js scanner at High severity.
function scanCSP(pageUrl) {
  const results = [];
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    results.push({
      type: 'Missing CSP',
      severity: 'Medium',
      description: 'No Content-Security-Policy meta tag found. CSP is the primary anti-XSS defence-in-depth control; absent CSP leaves the page reliant on output encoding alone.',
      location: pageUrl,
      recommendation: 'Add a Content-Security-Policy header (or meta tag) restricting script-src, style-src, and frame-ancestors. Start with report-only mode to discover violations.'
    });
  }
  return results;
}
