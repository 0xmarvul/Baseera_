// Insecure Forms Scanner
function scanInsecureForms(pageUrl) {
  const results = [];
  if (pageUrl.startsWith('http://')) {
    const pwInputs = document.querySelectorAll('input[type="password"]');
    if (pwInputs.length > 0) {
      results.push({ type: 'Insecure Forms', severity: 'Critical', description: 'Password field found on HTTP page.', location: pageUrl, recommendation: 'Always serve forms over HTTPS.' });
    }
  }
  return results;
}
