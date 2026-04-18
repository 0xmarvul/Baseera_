// Clickjacking Scanner
function scanClickjacking(pageUrl) {
  const results = [];
  if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
    results.push({ type: 'Clickjacking', severity: 'Medium', description: 'No X-Frame-Options protection found.', location: pageUrl, recommendation: 'Set X-Frame-Options: DENY or SAMEORIGIN.' });
  }
  return results;
}
