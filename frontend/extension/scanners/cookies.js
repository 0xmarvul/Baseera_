// Cookies Scanner
function scanCookies(pageUrl) {
  const results = [];
  if (document.cookie) {
    const count = document.cookie.split(';').length;
    results.push({ type: 'Insecure Cookies', severity: 'Medium', description: `${count} JS-accessible cookie(s) found (missing HttpOnly).`, location: pageUrl, recommendation: 'Set HttpOnly flag on sensitive cookies.' });
  }
  return results;
}
