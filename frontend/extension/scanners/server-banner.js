// Server / Technology Version Disclosure Scanner
// Flags generator meta tags and known banner comments that leak framework + version.
function scanServerBanner(pageUrl) {
  const results = [];
  const findings = [];

  const gen = document.querySelector('meta[name="generator" i]');
  if (gen) {
    const v = gen.getAttribute('content') || '';
    if (v.trim()) findings.push(`generator meta: "${v.slice(0, 80)}"`);
  }

  const html = document.documentElement.innerHTML;
  const banners = [
    /WordPress\s*\d+(\.\d+)+/i,
    /Drupal\s*\d+(\.\d+)+/i,
    /Joomla!?\s*\d+(\.\d+)+/i,
    /powered by [^<\n]{0,60}/i,
    /phpMyAdmin\s+\d+(\.\d+)+/i,
    /Apache\/\d+(\.\d+)+/i,
    /nginx\/\d+(\.\d+)+/i,
  ];
  banners.forEach(re => {
    const m = html.match(re);
    if (m) findings.push(m[0].slice(0, 80));
  });

  if (findings.length > 0) {
    results.push({
      type: 'Version Disclosure',
      severity: 'Low',
      description: `Framework / server version leaked: ${findings.slice(0, 3).join('; ')}.`,
      location: pageUrl,
      recommendation: 'Remove the generator meta tag and strip server/version headers at your reverse proxy.'
    });
  }
  return results;
}
