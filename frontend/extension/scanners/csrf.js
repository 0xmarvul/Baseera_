// CSRF Scanner - Forms without tokens
function scanCSRF(pageUrl) {
  const results = [];
  const forms = document.querySelectorAll('form[method="post"], form[method="POST"]');
  let unsafe = 0;
  forms.forEach(f => {
    if (!f.querySelector('input[name*="csrf"], input[name*="token"], input[name*="_token"]')) unsafe++;
  });
  if (unsafe > 0) {
    results.push({ type: 'CSRF', severity: 'Medium', description: `${unsafe} POST form(s) without CSRF tokens.`, location: pageUrl, recommendation: 'Include CSRF tokens in all state-changing forms.' });
  }
  return results;
}
