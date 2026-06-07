// Inline Event Handlers Scanner
// Flags elements that use onclick/onerror/onload attributes instead of
// addEventListener. Not a vulnerability on its own, but they defeat strict
// CSP (script-src cannot drop 'unsafe-inline' while they're present) and
// complicate code review. Low severity.
function scanInlineEventHandlers(pageUrl) {
  const results = [];
  try {
    const handlers = document.querySelectorAll('[onclick],[onmouseover],[onerror],[onload],[onfocus],[onblur],[onsubmit],[onchange]');
    if (handlers.length > 0) {
      results.push({
        type: 'Inline Event Handlers',
        severity: 'Low',
        description: `${handlers.length} element(s) using inline event handler attributes. Not a vulnerability on its own — but they defeat strict CSP and make code review harder.`,
        location: pageUrl,
        recommendation: "Move handlers to addEventListener in a separate script file. Enables Content-Security-Policy 'script-src' to drop 'unsafe-inline'."
      });
    }
  } catch (e) {}
  return results;
}
