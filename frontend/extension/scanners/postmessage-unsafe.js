// Insecure postMessage Scanner
// Flags inline scripts that register a 'message' listener without checking event.origin.
function scanPostMessageUnsafe(pageUrl) {
  const results = [];
  const listenerRe = /addEventListener\s*\(\s*["'`]message["'`]/;
  const originRe = /\b(e|ev|evt|event|msg)\.origin\b/;

  const scripts = document.querySelectorAll('script:not([src])');
  let hits = 0;
  scripts.forEach(s => {
    const code = s.textContent || '';
    if (listenerRe.test(code) && !originRe.test(code)) hits++;
  });

  if (hits > 0) {
    results.push({
      type: 'Insecure postMessage',
      severity: 'High',
      description: `${hits} 'message' event listener(s) do not verify event.origin.`,
      location: pageUrl,
      recommendation: 'Always validate event.origin against an allow-list inside message handlers; never trust the payload blindly.'
    });
  }
  return results;
}
