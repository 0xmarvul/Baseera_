// XSS Scanner - Check for inline scripts, eval(), innerHTML, javascript: URLs
function scanXSS(pageUrl) {
  const results = [];
  const scripts = document.querySelectorAll('script:not([src])');
  const dangerousPatterns = /eval\s*\(|innerHTML\s*=|document\.write\s*\(|javascript:/i;
  scripts.forEach(s => {
    if (dangerousPatterns.test(s.textContent)) {
      results.push({ type: 'XSS', severity: 'Critical', description: 'Unsafe inline JavaScript detected (eval/innerHTML/document.write).', location: pageUrl, recommendation: 'Avoid eval(), use textContent instead of innerHTML.' });
    }
  });
  const handlers = document.querySelectorAll('[onclick],[onmouseover],[onerror],[onload]');
  if (handlers.length > 0) {
    results.push({ type: 'XSS', severity: 'High', description: `${handlers.length} inline event handler(s) found.`, location: pageUrl, recommendation: 'Use addEventListener instead of inline event handlers.' });
  }
  return results;
}
