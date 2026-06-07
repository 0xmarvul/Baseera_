// CSRF Scanner - POST forms missing a visible CSRF hidden field.
// DOM-only heuristic. False positives are common on modern frameworks that
// rely on SameSite cookies or X-CSRF-Token headers instead of hidden fields.
function scanCSRF(pageUrl) {
  const results = [];
  const forms = document.querySelectorAll('form[method="post"], form[method="POST"]');
  let unsafe = 0;
  forms.forEach(f => {
    if (!f.querySelector('input[name*="csrf"], input[name*="token"], input[name*="_token"]')) unsafe++;
  });
  if (unsafe > 0) {
    results.push({
      type: 'CSRF',
      severity: 'Medium',
      description: `${unsafe} POST form(s) without a visible CSRF token hidden field. This is a DOM-only heuristic and may be a false positive on modern frameworks that use cookie-based CSRF (SameSite=Strict cookies) or header tokens (X-CSRF-Token, X-XSRF-TOKEN) instead of hidden form fields.`,
      location: pageUrl,
      recommendation: 'Verify your framework uses one of: SameSite=Strict cookies, a synchroniser-token pattern, or an anti-forgery header. If none, add a CSRF token hidden field to every state-changing form.'
    });
  }
  return results;
}
