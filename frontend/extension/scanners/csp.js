// CSP Scanner
function scanCSP(pageUrl) {
  const results = [];
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    results.push({ type: 'Missing CSP', severity: 'High', description: 'No Content-Security-Policy found.', location: pageUrl, recommendation: 'Add a CSP header or meta tag.' });
  }
  return results;
}
