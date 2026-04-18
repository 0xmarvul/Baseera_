// SRI Scanner - Missing Subresource Integrity
function scanSRI(pageUrl) {
  const results = [];
  const external = Array.from(document.querySelectorAll('script[src]:not([integrity])')).filter(s => {
    const src = s.getAttribute('src') || '';
    return src.startsWith('http') && !src.includes(window.location.hostname);
  });
  if (external.length > 0) {
    results.push({ type: 'Missing SRI', severity: 'Medium', description: `${external.length} external script(s) without integrity attribute.`, location: pageUrl, recommendation: 'Add integrity and crossorigin attributes to external scripts.' });
  }
  return results;
}
