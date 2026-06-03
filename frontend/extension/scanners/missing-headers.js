// Missing Security Headers Scanner (passive - checks meta tags)
// Reports each missing header as a separate finding for clarity.
function scanMissingHeaders(pageUrl) {
  const results = [];
  const checks = [
    { attr: 'X-Content-Type-Options', rec: 'Add X-Content-Type-Options: nosniff to prevent MIME sniffing.' },
    { attr: 'Referrer-Policy', rec: 'Add Referrer-Policy: strict-origin-when-cross-origin (or stricter).' },
    { attr: 'Permissions-Policy', rec: 'Add Permissions-Policy to restrict powerful features (camera, microphone, geolocation).' },
    { attr: 'Cross-Origin-Opener-Policy', rec: 'Add Cross-Origin-Opener-Policy: same-origin to mitigate Spectre-class side-channel leaks.' },
  ];
  checks.forEach(c => {
    const sel = `meta[http-equiv="${c.attr}" i]`;
    if (!document.querySelector(sel)) {
      results.push({
        type: `Missing ${c.attr}`,
        severity: 'Low',
        description: `No ${c.attr} meta tag detected on this page (defense-in-depth hardening, not a direct vulnerability).`,
        location: pageUrl,
        recommendation: c.rec
      });
    }
  });
  return results;
}
