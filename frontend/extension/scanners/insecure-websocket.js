// Insecure WebSocket Scanner (passive)
// Scans the page's inline scripts and anchors for ws:// URLs when the page
// itself is served over HTTPS. We do NOT open any WebSocket — the scan is
// purely a DOM read.
function scanInsecureWebSocket(pageUrl) {
  const results = [];
  try {
    if (location.protocol !== 'https:') return results;

    const hits = new Set();
    const scriptText = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent || '').join('\n');
    const wsRegex = /\bws:\/\/[^"'\s)<>]+/gi;
    let m;
    while ((m = wsRegex.exec(scriptText)) !== null) hits.add(m[0].slice(0, 120));
    document.querySelectorAll('a[href^="ws://" i]').forEach(a => hits.add(a.getAttribute('href')));

    if (hits.size > 0) {
      results.push({
        type: 'Insecure WebSocket',
        severity: 'High',
        description: `${hits.size} insecure WebSocket URL(s) (ws://) found on an HTTPS page. Traffic over ws:// is unencrypted, allowing on-path attackers to read or inject messages — modern browsers will refuse the connection from a secure page.`,
        location: pageUrl,
        recommendation: 'Switch every WebSocket URL to wss:// and ensure the server presents a valid TLS certificate. Keep ws:// only for local development on http://localhost.'
      });
    }
  } catch (e) {}
  return results;
}
