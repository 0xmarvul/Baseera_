// Open Redirect Scanner
function scanOpenRedirect(pageUrl) {
  const results = [];
  const params = new URLSearchParams(window.location.search);
  ['redirect', 'url', 'next', 'return', 'returnUrl', 'goto'].forEach(p => {
    const val = params.get(p);
    if (val && (val.startsWith('http') || val.startsWith('//'))) {
      results.push({ type: 'Open Redirect', severity: 'Medium', description: `Redirect parameter "${p}" may allow open redirect.`, location: pageUrl, recommendation: 'Validate and whitelist redirect URLs server-side.' });
    }
  });
  return results;
}
