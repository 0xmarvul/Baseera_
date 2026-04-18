// Command Injection Scanner
function scanCommandInjection(pageUrl) {
  const results = [];
  const body = document.body?.textContent || '';
  if (/sh:\s+\d+:|permission denied|command not found|bash:/i.test(body)) {
    results.push({ type: 'Command Injection', severity: 'Critical', description: 'System command error output detected.', location: pageUrl, recommendation: 'Never expose command output to users. Sanitize all inputs.' });
  }
  return results;
}
