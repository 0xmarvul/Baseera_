// Weak Content-Security-Policy Scanner
// Flags CSP meta tags containing unsafe-inline, unsafe-eval, or wildcard sources.
function scanWeakCSP(pageUrl) {
  const results = [];
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
  if (!meta) return results;

  const content = meta.getAttribute('content') || '';
  const issues = [];
  if (/'unsafe-inline'/i.test(content)) issues.push("'unsafe-inline'");
  if (/'unsafe-eval'/i.test(content)) issues.push("'unsafe-eval'");
  if (/\s\*\s|\s\*;|\s\*$/.test(content)) issues.push('wildcard source (*)');
  if (!/frame-ancestors/i.test(content)) issues.push('missing frame-ancestors');

  if (issues.length > 0) {
    results.push({
      type: 'Weak CSP',
      severity: 'High',
      description: `Content-Security-Policy contains unsafe directives: ${issues.join(', ')}.`,
      location: pageUrl,
      recommendation: "Remove 'unsafe-inline' and 'unsafe-eval', replace wildcards with explicit origins, and add a frame-ancestors directive."
    });
  }
  return results;
}
