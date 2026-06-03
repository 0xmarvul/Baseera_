// Session / Token in URL Scanner
// Flags sensitive identifiers carried in the URL (leaks via referrer, logs, bookmarks).
function scanSessionInUrl(pageUrl) {
  const results = [];
  const url = String(pageUrl || location.href);
  const bad = /[?&#](jsessionid|phpsessid|sid|sessionid|token|access_token|id_token|auth|apikey|api_key)=/i;
  if (bad.test(url)) {
    results.push({
      type: 'Session Token in URL',
      severity: 'High',
      description: 'Session or authentication token transmitted via URL parameters.',
      location: pageUrl,
      recommendation: 'Move tokens into the Authorization header or HttpOnly cookies. URLs are logged in proxies, browser history, and referrer headers.'
    });
  }
  return results;
}
