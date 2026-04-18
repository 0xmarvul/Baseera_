// DOM-based XSS Sink Scanner
// Flags inline scripts that read an untrusted source (location.hash, document.URL,
// window.name, document.referrer) AND write to a dangerous sink (innerHTML,
// document.write, eval, setTimeout(string)).
function scanDomXssSinks(pageUrl) {
  const results = [];
  const sourceRe = /\b(location\.(hash|search|href)|document\.(URL|documentURI|referrer)|window\.name)\b/;
  const sinkRe = /\b(innerHTML|outerHTML)\s*=|document\.write\s*\(|\beval\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]|\bFunction\s*\(/;

  const scripts = document.querySelectorAll('script:not([src])');
  let hits = 0;
  scripts.forEach(s => {
    const code = s.textContent || '';
    if (sourceRe.test(code) && sinkRe.test(code)) hits++;
  });

  if (hits > 0) {
    results.push({
      type: 'DOM-based XSS',
      severity: 'High',
      description: `${hits} inline script(s) pipe an untrusted source (location/referrer/window.name) into a dangerous sink (innerHTML/document.write/eval).`,
      location: pageUrl,
      recommendation: 'Treat location.*, document.referrer, and window.name as untrusted. Sanitize before rendering; prefer textContent and safe DOM APIs.'
    });
  }
  return results;
}
