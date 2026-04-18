// Deprecated HTML Scanner
function scanDeprecatedHTML(pageUrl) {
  const results = [];
  const deprecated = ['font', 'center', 'marquee', 'blink', 'strike', 'big', 'tt'];
  const found = deprecated.filter(tag => document.querySelector(tag));
  if (found.length > 0) {
    results.push({ type: 'Deprecated HTML', severity: 'Low', description: `Deprecated HTML tags: ${found.map(t => '<'+t+'>').join(', ')}.`, location: pageUrl, recommendation: 'Replace deprecated HTML tags with modern CSS.' });
  }
  return results;
}
