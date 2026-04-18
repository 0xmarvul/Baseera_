// CORS Scanner
function scanCORS(pageUrl) {
  const results = [];
  const html = document.documentElement.outerHTML;
  if (html.includes('Access-Control-Allow-Origin: *') || html.includes("'*'")) {
    results.push({ type: 'CORS Issues', severity: 'Medium', description: 'Wildcard CORS policy detected.', location: pageUrl, recommendation: 'Restrict CORS to specific trusted origins.' });
  }
  return results;
}
