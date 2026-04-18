// Debug Pages Scanner
function scanDebugPages(pageUrl) {
  const results = [];
  const debugPaths = ['/debug', '/test', '/trace', '/phpinfo', '/server-info', '/_debug'];
  if (debugPaths.some(p => pageUrl.toLowerCase().includes(p))) {
    results.push({ type: 'Debug Pages', severity: 'Medium', description: 'Current page appears to be a debug/test endpoint.', location: pageUrl, recommendation: 'Disable debug endpoints in production.' });
  }
  return results;
}
