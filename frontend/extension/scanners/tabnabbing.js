// Reverse Tabnabbing Scanner
// Flags <a target="_blank"> links that do not include rel="noopener" (or "noreferrer").
function scanTabnabbing(pageUrl) {
  const results = [];
  const links = document.querySelectorAll('a[target="_blank"]');
  let risky = 0;
  links.forEach(a => {
    const rel = (a.getAttribute('rel') || '').toLowerCase();
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) risky++;
  });
  if (risky > 0) {
    results.push({
      type: 'Reverse Tabnabbing',
      severity: 'Low',
      description: `${risky} external link(s) with target="_blank" are missing rel="noopener" / "noreferrer".`,
      location: pageUrl,
      recommendation: 'Add rel="noopener noreferrer" to every target="_blank" link to prevent the opened page from hijacking window.opener.'
    });
  }
  return results;
}
