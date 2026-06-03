// API Keys Exposure Scanner
// Scans the full page source (HTML, inline scripts, comments) for credential patterns.
function scanAPIKeys(pageUrl) {
  const results = [];
  const html = document.documentElement.innerHTML;
  const patterns = [
    { regex: /AIza[0-9A-Za-z\-_]{35}/, name: 'Google API Key' },
    { regex: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
    { regex: /sk-[A-Za-z0-9]{48}/, name: 'OpenAI API Key' },
    { regex: /sk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Secret Key (live)' },
    { regex: /pk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Publishable Key (live)' },
    { regex: /rk_live_[0-9a-zA-Z]{24,}/, name: 'Stripe Restricted Key (live)' },
    { regex: /ghp_[A-Za-z0-9]{36}/, name: 'GitHub Personal Access Token' },
    { regex: /gho_[A-Za-z0-9]{36}/, name: 'GitHub OAuth Token' },
    { regex: /xox[baprs]-[0-9A-Za-z\-]{10,}/, name: 'Slack Token' },
    { regex: /AC[a-f0-9]{32}/, name: 'Twilio Account SID' },
    { regex: /SK[a-f0-9]{32}/, name: 'Twilio API Key' },
    { regex: /SG\.[\w\-]{22}\.[\w\-]{43}/, name: 'SendGrid API Key' },
    { regex: /key-[0-9a-zA-Z]{32}/, name: 'Mailgun API Key' },
    { regex: /sq0(?:atp|csp)-[0-9A-Za-z\-_]{22,43}/, name: 'Square Token' },
    { regex: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/, name: 'JWT Token' },
    { regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, name: 'Private Key Block' },
    { regex: /AccountKey=[A-Za-z0-9+/=]{40,}/, name: 'Azure Storage Account Key' },
    { regex: /"type":\s*"service_account"/, name: 'GCP Service Account JSON' },
    { regex: /firebase[^,]{0,30}apiKey[^,]{0,10}["'][A-Za-z0-9_\-]{20,}["']/i, name: 'Firebase API Key' },
  ];
  patterns.forEach(p => {
    if (p.regex.test(html)) {
      results.push({
        type: 'API Keys Exposure',
        severity: 'Critical',
        description: `Exposed ${p.name} found in page source.`,
        location: pageUrl,
        recommendation: 'Move secrets to server-side environment variables. Rotate any leaked credential immediately.'
      });
    }
  });
  return results;
}
