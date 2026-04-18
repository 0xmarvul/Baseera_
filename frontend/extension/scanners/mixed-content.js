// Mixed Content Scanner
function scanMixedContent(pageUrl) {
  const results = [];
  if (pageUrl.startsWith('https://')) {
    const http = document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"]');
    if (http.length > 0) {
      results.push({ type: 'Mixed Content', severity: 'Medium', description: `${http.length} resource(s) loaded over HTTP on HTTPS page.`, location: pageUrl, recommendation: 'Serve all resources over HTTPS.' });
    }
  }
  return results;
}
