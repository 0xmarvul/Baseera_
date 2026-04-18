// Sensitive Files Scanner
function scanSensitiveFiles(pageUrl) {
  const results = [];
  const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
  const sensitivePatterns = /\/(\.git|\.env|\.htaccess|wp-admin|phpmyadmin|admin|backup|config)/i;
  const found = links.filter(href => sensitivePatterns.test(href));
  if (found.length > 0) {
    results.push({ type: 'Sensitive Files', severity: 'High', description: `${found.length} link(s) to sensitive paths found.`, location: found[0], recommendation: 'Restrict access to sensitive directories.' });
  }
  return results;
}
