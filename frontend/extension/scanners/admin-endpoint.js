// Admin Endpoint Exposure Scanner
// Greps client-visible JavaScript and link/form actions for references to
// internal API paths (/api/admin/, /api/internal/, /api/debug/, etc.).
// Server-side enforcement is the real control, but leaking these paths in
// public JS hands attackers a target list.
function scanAdminEndpoint(pageUrl) {
  const results = [];
  try {
    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent || '').join('\n');
    const linkActions = Array.from(document.querySelectorAll('a[href], form[action]'))
      .map(el => (el.getAttribute('href') || el.getAttribute('action') || '')).join('\n');
    const sources = inlineScripts + '\n' + linkActions;

    const adminEndpointRe = /\b\/?api\/(admin|internal|debug|private|sudo|root|management|maintenance|sys|system)\/[a-z0-9_\-\/.]+/gi;
    const hits = new Set();
    let m;
    while ((m = adminEndpointRe.exec(sources)) !== null) hits.add(m[0].slice(0, 120));

    if (hits.size > 0) {
      results.push({
        type: 'Admin Endpoint Exposure',
        severity: 'High',
        description: `${hits.size} internal/admin API endpoint reference(s) found in client code. These paths should not be reachable by the public — leaking them in browser-visible JS makes them an obvious target.`,
        location: pageUrl,
        recommendation: 'Remove admin/internal endpoint references from client-side JavaScript. Enforce authentication AND authorization on every such route server-side, and consider blocking the entire path at your edge / WAF for anything outside the office IP.'
      });
    }
  } catch (e) {}
  return results;
}
