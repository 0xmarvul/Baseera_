// HSTS Scanner
function scanHSTS(pageUrl) {
  const results = [];
  if (pageUrl.startsWith('https://') && !document.querySelector('meta[http-equiv="Strict-Transport-Security"]')) {
    results.push({ type: 'Missing HSTS', severity: 'Medium', description: 'No Strict-Transport-Security meta tag found.', location: pageUrl, recommendation: 'Enable HSTS to prevent protocol downgrade attacks.' });
  }
  return results;
}
