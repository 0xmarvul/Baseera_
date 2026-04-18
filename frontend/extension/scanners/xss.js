// XSS Scanner - inline-handler, javascript: URL, iframe srcdoc, and reflected-parameter checks.
function scanXSS(pageUrl) {
  const results = [];

  // 1. Dangerous inline script patterns (eval/innerHTML/document.write)
  const scripts = document.querySelectorAll('script:not([src])');
  const dangerousPatterns = /eval\s*\(|innerHTML\s*=|document\.write\s*\(|javascript:/i;
  scripts.forEach(s => {
    if (dangerousPatterns.test(s.textContent || '')) {
      results.push({
        type: 'XSS',
        severity: 'Critical',
        description: 'Unsafe inline JavaScript detected (eval/innerHTML/document.write).',
        location: pageUrl,
        recommendation: 'Avoid eval(); use textContent instead of innerHTML; remove document.write().'
      });
    }
  });

  // 2. Inline event handlers
  const handlers = document.querySelectorAll('[onclick],[onmouseover],[onerror],[onload],[onfocus],[onblur]');
  if (handlers.length > 0) {
    results.push({
      type: 'XSS',
      severity: 'High',
      description: `${handlers.length} inline event handler(s) found.`,
      location: pageUrl,
      recommendation: 'Use addEventListener instead of inline event handlers.'
    });
  }

  // 3. javascript: URLs in <a> or <form>
  if (document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]').length > 0) {
    results.push({
      type: 'XSS',
      severity: 'Critical',
      description: 'Element uses javascript: URL scheme (href/action).',
      location: pageUrl,
      recommendation: 'Never use javascript: URLs. Bind click/submit handlers via addEventListener.'
    });
  }

  // 4. iframe srcdoc injection
  if (document.querySelectorAll('iframe[srcdoc]').length > 0) {
    results.push({
      type: 'XSS',
      severity: 'High',
      description: 'iframe with srcdoc attribute detected (inline HTML injection surface).',
      location: pageUrl,
      recommendation: 'Avoid srcdoc with untrusted content; sandbox iframes with restrictive attributes.'
    });
  }

  // 5. Reflected URL parameter in DOM body
  try {
    const body = document.body ? document.body.innerHTML : '';
    const params = new URLSearchParams(location.search);
    const hash = location.hash.slice(1);
    const values = [...Array.from(params.values()), hash].filter(v => v && v.length >= 6);
    for (const v of values) {
      if (body.indexOf(v) !== -1) {
        results.push({
          type: 'Reflected XSS',
          severity: 'High',
          description: `URL parameter value "${v.slice(0, 40)}..." appears verbatim in the page body (possible reflected XSS sink).`,
          location: pageUrl,
          recommendation: 'HTML-encode all user input before inserting it into the DOM. Prefer textContent over innerHTML.'
        });
        break;
      }
    }
  } catch (e) { /* ignore */ }

  return results;
}
