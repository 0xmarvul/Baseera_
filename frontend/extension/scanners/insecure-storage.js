// Insecure Client-Side Storage Scanner
// Flags localStorage / sessionStorage keys or values that look like secrets / PII.
function scanInsecureStorage(pageUrl) {
  const results = [];
  const sensitiveKey = /password|secret|token|api[_-]?key|credit|ssn|jwt|bearer|auth/i;
  const jwtShape = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  const ccShape = /\b(?:\d[ -]*?){13,19}\b/;

  const scanStore = (store, label) => {
    try {
      const keys = Object.keys(store);
      const hits = [];
      keys.forEach(k => {
        const v = store.getItem(k) || '';
        if (sensitiveKey.test(k) || jwtShape.test(v) || ccShape.test(v)) {
          hits.push(k);
        }
      });
      if (hits.length > 0) {
        results.push({
          type: 'Insecure Storage',
          severity: 'High',
          description: `Potentially sensitive data in ${label}: ${hits.join(', ')}.`,
          location: pageUrl,
          recommendation: 'Do not store tokens, secrets, or PII in web storage. Use HttpOnly session cookies or a short-lived in-memory cache.'
        });
      }
    } catch (e) { /* storage blocked */ }
  };

  scanStore(localStorage, 'localStorage');
  scanStore(sessionStorage, 'sessionStorage');
  return results;
}
