// Source Map Exposure Scanner
// Flags inline scripts whose content declares a sourceMappingURL comment.
function scanSourceMaps(pageUrl) {
  const results = [];
  const re = /\/[*/]#\s*sourceMappingURL\s*=\s*([^\s*]+)/;
  const scripts = document.querySelectorAll('script:not([src])');
  const maps = new Set();
  scripts.forEach(s => {
    const m = (s.textContent || '').match(re);
    if (m) maps.add(m[1]);
  });
  // Also scan raw HTML (covers script src files when inlined by the site)
  const htmlMatch = document.documentElement.innerHTML.match(re);
  if (htmlMatch) maps.add(htmlMatch[1]);

  if (maps.size > 0) {
    results.push({
      type: 'Source Map Exposure',
      severity: 'Medium',
      description: `Source map reference(s) detected: ${[...maps].slice(0, 3).join(', ')}.`,
      location: pageUrl,
      recommendation: 'Do not ship .map files to production, or restrict access via web-server rules. Source maps reveal original code.'
    });
  }
  return results;
}
