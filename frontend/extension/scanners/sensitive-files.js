// Sensitive Files Scanner
// Scans links, scripts, styles, images, iframes, and HTML comments for sensitive paths.
// Also detects directory listing via <title>Index of /...</title>.
function scanSensitiveFiles(pageUrl) {
  const results = [];
  // Anchored on "/" so "/administration-team" won't falsely match /admin.
  const patterns = /\/(\.git(\/|$)|\.svn\/|\.hg\/|\.env(\.|$|\/)|\.htaccess|\.htpasswd|\.DS_Store|\.idea\/|\.vscode\/|\.aws\/|\.npmrc|\.bak|\.old|\.orig|\.swp|id_rsa|id_dsa|Thumbs\.db|wp-admin|wp-config|phpmyadmin|phpinfo\.php|server-status|server-info|web\.config|composer\.lock|package-lock\.json|database\.sql|config\.(php|json|yml|yaml|inc\.php)|admin(istrator)?(\/|$|\?|\.php)|admin[-_]?(panel|cp|console)(\/|$|\?)|swagger(-ui)?(\/|$|\?)|api-docs(\/|$|\?)|openapi(\.json|\.yaml|\/|$)|graphql(\/|$|\?)|graphiql(\/|$|\?)|actuator(\/|$|\?)|jolokia(\/|$|\?)|console(\/|$|\?)|(private|internal|intranet)(\/|$|\?)|(backup|backups|bak|old|archive)(\/|$|\?|\.)|cgi-bin\/|\/bin(\/|$)|\/ws(\/|$)|\/sbin(\/|$)|\/etc(\/|$)|\/proc(\/|$)|\/tmp(\/|$)|\.svn\/wc\.db|\.git\/HEAD|\.git\/config|\.git\/index|core\.dump|crash\.log|dump\.sql|dump\.tar|wp-content\/(uploads|debug\.log)|node_modules\/|vendor\/|tests?\/|spec\/|fixtures?\/)/i;

  const urls = new Set();
  // Also test the page itself — if the user is *on* an admin page, flag it.
  if (pageUrl) urls.add(pageUrl);
  document.querySelectorAll('a[href], link[href], script[src], img[src], iframe[src], source[src]').forEach(el => {
    const v = el.getAttribute('href') || el.getAttribute('src') || '';
    if (v) urls.add(v);
  });

  // Include HTML comments (often hide backup paths / TODOs)
  const commentWalker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
  let node;
  while ((node = commentWalker.nextNode())) {
    urls.add(node.nodeValue || '');
  }

  const hits = [...urls].filter(u => patterns.test(u));
  if (hits.length > 0) {
    results.push({
      type: 'Sensitive Files',
      severity: 'High',
      description: `${hits.length} reference(s) to potentially sensitive paths found.`,
      location: hits[0].slice(0, 200),
      recommendation: 'Block access to these paths at the web server level. Remove backup and VCS files from production.'
    });
  }

  // Directory listing
  if (typeof document.title === 'string' && document.title.toLowerCase().startsWith('index of /')) {
    results.push({
      type: 'Directory Listing',
      severity: 'Medium',
      description: 'Directory listing is enabled on this endpoint.',
      location: pageUrl,
      recommendation: 'Disable directory listing (Options -Indexes in Apache, autoindex off in Nginx).'
    });
  }

  return results;
}
