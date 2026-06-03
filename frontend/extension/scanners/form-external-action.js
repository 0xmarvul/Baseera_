// External Form Action Scanner
// Flags forms that submit to a different origin than the current page
// (potential credential phishing / data exfiltration risk).
function scanFormExternalAction(pageUrl) {
  const results = [];
  try {
    const pageOrigin = location.origin;
    const forms = document.querySelectorAll('form[action]');
    const external = [];
    forms.forEach(f => {
      const action = f.getAttribute('action') || '';
      if (!action || action.startsWith('#') || action.startsWith('/') || action.startsWith('?')) return;
      try {
        const u = new URL(action, location.href);
        if (u.origin && u.origin !== pageOrigin) {
          external.push(`${u.origin}${u.pathname}`);
        }
      } catch (e) { /* invalid URL */ }
    });
    if (external.length > 0) {
      const hasPassword = Array.from(document.querySelectorAll('form input[type="password"]')).length > 0;
      results.push({
        type: 'External Form Action',
        severity: hasPassword ? 'High' : 'Medium',
        description: `${external.length} form(s) submit to a different origin: ${external.slice(0, 3).join(', ')}.`,
        location: pageUrl,
        recommendation: 'Only submit sensitive forms to your own backend. If an external action is intentional, verify it over HTTPS and document the dependency.'
      });
    }
  } catch (e) {}
  return results;
}
