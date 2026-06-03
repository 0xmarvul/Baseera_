// Outdated JavaScript Libraries Scanner
// Fingerprints common libraries via their global version properties.
function scanOutdatedLibs(pageUrl) {
  const results = [];
  const w = window;
  const lt = (a, b) => {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x < y;
    }
    return false;
  };

  const add = (name, version, minSafe) => {
    results.push({
      type: 'Outdated Components',
      severity: 'High',
      description: `${name} ${version} is older than the recommended ${minSafe}. Known CVEs may apply.`,
      location: pageUrl,
      recommendation: `Upgrade ${name} to ${minSafe} or later. Audit regularly with Retire.js, npm audit, or Snyk.`
    });
  };

  try { if (w.jQuery && w.jQuery.fn && w.jQuery.fn.jquery && lt(w.jQuery.fn.jquery, '3.5.0')) add('jQuery', w.jQuery.fn.jquery, '3.5.0'); } catch (e) {}
  try { if (w.angular && w.angular.version && w.angular.version.full) {
    const v = w.angular.version.full;
    if (v.startsWith('1.')) add('AngularJS', v, '(migrate off — AngularJS 1.x is end-of-life)');
  } } catch (e) {}
  try { if (w._ && w._.VERSION && lt(w._.VERSION, '4.17.21')) add('lodash', w._.VERSION, '4.17.21'); } catch (e) {}
  try {
    const b = document.querySelector('link[href*="bootstrap"], script[src*="bootstrap"]');
    if (b) {
      const src = b.getAttribute('href') || b.getAttribute('src') || '';
      const m = src.match(/bootstrap[.\-/@](\d+\.\d+\.\d+)/i);
      if (m && lt(m[1], '4.3.1')) add('Bootstrap', m[1], '4.3.1');
    }
  } catch (e) {}
  try {
    if (w.Vue && w.Vue.version && w.Vue.version.startsWith('2.')) {
      add('Vue 2.x', w.Vue.version, '3.x (Vue 2 reached end-of-life Dec 2023)');
    }
  } catch (e) {}
  try {
    if (w.moment && w.moment.version) {
      // Moment.js is in maintenance mode — always flag as deprecated.
      add('Moment.js', w.moment.version, 'a modern alternative (date-fns, dayjs, Luxon)');
    }
  } catch (e) {}

  return results;
}
