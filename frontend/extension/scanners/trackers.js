// Excessive Trackers Scanner
// Fires only at 5+ third-party trackers so a typical site with Google
// Analytics alone doesn't get a finding. Privacy/compliance signal, not
// a vulnerability.
function scanTrackers(pageUrl) {
  const results = [];
  const trackerDomains = ['google-analytics.com', 'googletagmanager.com', 'facebook.net', 'hotjar.com', 'mixpanel.com', 'segment.com', 'amplitude.com', 'fullstory.com', 'logrocket.com', 'matomo.org', 'plausible.io', 'snowplowanalytics.com'];
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  const found = trackerDomains.filter(t => scripts.some(s => s.includes(t)));
  if (found.length >= 5) {
    results.push({
      type: 'Excessive Trackers',
      severity: 'Low',
      description: `5+ third-party tracking scripts detected (${found.length} total): ${found.join(', ')}. Each tracker is a third-party supply-chain dependency that can be hijacked, and a GDPR/CCPA consent surface.`,
      location: pageUrl,
      recommendation: 'Audit each tracker for business need. Remove duplicates and obsolete pixels. Ensure your cookie banner asks consent for each tracking purpose under GDPR/CCPA.'
    });
  }
  return results;
}
