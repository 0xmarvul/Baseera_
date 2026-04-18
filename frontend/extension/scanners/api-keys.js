// API Keys Exposure Scanner
function scanAPIKeys(pageUrl) {
  const results = [];
  const html = document.documentElement.innerHTML;
  const patterns = [
    { regex: /AIza[0-9A-Za-z-_]{35}/, name: 'Google API Key' },
    { regex: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
    { regex: /sk-[a-zA-Z0-9]{32,}/, name: 'Secret Key' },
    { regex: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Token' },
  ];
  patterns.forEach(p => {
    if (p.regex.test(html)) {
      results.push({ type: 'API Keys Exposure', severity: 'Critical', description: `Exposed ${p.name} found in page source.`, location: pageUrl, recommendation: 'Move API keys to server-side environment variables.' });
    }
  });
  return results;
}
