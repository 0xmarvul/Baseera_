// XSS Scanner — dangerous-pattern, javascript: URL, iframe srcdoc, and
// reflected-parameter checks. Inline event handlers moved out to their own
// scanner (inline-event-handlers.js) because they're code-quality, not XSS.
function scanXSS(pageUrl) {
  const results = [];

  // 1. Dangerous inline script patterns (eval/innerHTML/document.write)
  const scripts = document.querySelectorAll('script:not([src])');
  const dangerousPatterns = /eval\s*\(|innerHTML\s*=|document\.write\s*\(|javascript:/i;
  scripts.forEach(s => {
    if (dangerousPatterns.test(s.textContent || '')) {
      results.push({
        type: 'XSS',
        severity: 'Medium',
        description: 'Potentially unsafe inline JavaScript patterns detected (eval/innerHTML/document.write). Code-smell, not a confirmed XSS.',
        location: pageUrl,
        recommendation: 'Avoid eval(); use textContent instead of innerHTML; remove document.write().'
      });
    }
  });

  // 2. javascript: URLs in <a> or <form>
  if (document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]').length > 0) {
    results.push({
      type: 'XSS',
      severity: 'Critical',
      description: 'Element uses javascript: URL scheme (href/action).',
      location: pageUrl,
      recommendation: 'Never use javascript: URLs. Bind click/submit handlers via addEventListener.'
    });
  }

  // 3. iframe srcdoc injection
  if (document.querySelectorAll('iframe[srcdoc]').length > 0) {
    results.push({
      type: 'XSS',
      severity: 'High',
      description: 'iframe with srcdoc attribute detected (inline HTML injection surface).',
      location: pageUrl,
      recommendation: 'Avoid srcdoc with untrusted content; sandbox iframes with restrictive attributes.'
    });
  }

  // 4. Reflected URL parameter — only fire when the value lands in a
  // dangerous context (script body, inline event handler attr, javascript:
  // URL, or src attr). Plain body-text reflection is normal (search pages,
  // breadcrumbs) and is no longer reported.
  try {
    const params = new URLSearchParams(location.search);
    const hash = location.hash.slice(1);
    const values = [...Array.from(params.values()), hash].filter(v => v && v.length >= 6);
    if (values.length === 0) return results;

    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent || '').join('\n');
    const handlerAttrs = ['onclick','onerror','onload','onmouseover','onfocus','onblur','onsubmit','onchange'];
    const handlerText = Array.from(document.querySelectorAll('[onclick],[onerror],[onload],[onmouseover],[onfocus],[onblur],[onsubmit],[onchange]'))
      .flatMap(el => handlerAttrs.map(a => el.getAttribute(a) || '').filter(Boolean))
      .join('\n');
    const jsHrefs = Array.from(document.querySelectorAll('a[href^="javascript:" i], form[action^="javascript:" i]'))
      .map(el => (el.getAttribute('href') || el.getAttribute('action') || '')).join('\n');
    const srcAttrs = Array.from(document.querySelectorAll('img[src], iframe[src], script[src]'))
      .map(el => el.getAttribute('src') || '').join('\n');
    const dangerousContext = inlineScripts + '\n' + handlerText + '\n' + jsHrefs + '\n' + srcAttrs;

    for (const v of values) {
      if (dangerousContext.indexOf(v) !== -1) {
        results.push({
          type: 'Reflected XSS',
          severity: 'High',
          description: 'URL parameter value lands inside a dangerous context (inline script / event handler / javascript: URL / src attribute) without encoding.',
          location: pageUrl,
          recommendation: 'HTML-encode user input before inserting into the DOM. Never echo URL parameters into <script> blocks, event-handler attributes, or src attributes without strict sanitisation.'
        });
        break;
      }
    }
  } catch (e) { /* ignore */ }

  return results;
}
