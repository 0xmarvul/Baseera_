// Excessive Trackers Scanner
function scanTrackers(pageUrl) {
  const results = [];
  const trackerDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.net', 'hotjar.com', 'mixpanel.com', 'segment.com'];
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  const found = trackerDomains.filter(t => scripts.some(s => s.includes(t)));
  if (found.length >= 3) {
    results.push({ type: 'Excessive Trackers', severity: 'Low', description: `${found.length} tracking scripts: ${found.join(', ')}.`, location: pageUrl, recommendation: 'Review third-party tracking for GDPR/CCPA compliance.' });
  }
  return results;
}
