// Sensitive Form Autocomplete Scanner
// Flags password fields that allow autocomplete, and credit-card fields without autocomplete="off".
function scanAutocompleteSensitive(pageUrl) {
  const results = [];
  try {
    const passwords = Array.from(document.querySelectorAll('input[type="password"]'));
    const risky = passwords.filter(p => {
      const ac = (p.getAttribute('autocomplete') || '').toLowerCase();
      return ac === '' || ac === 'on' || ac === 'true';
    });
    if (risky.length > 0) {
      results.push({
        type: 'Sensitive Autocomplete',
        severity: 'Low',
        description: `${risky.length} password input(s) allow browser autocomplete.`,
        location: pageUrl,
        recommendation: 'Set autocomplete="new-password" on signup/reset forms and autocomplete="current-password" on login forms.'
      });
    }

    const ccNames = /(cc|card|credit)[-_]?(number|num|no|pan)/i;
    const ccFields = Array.from(document.querySelectorAll('input[name], input[id], input[autocomplete]'))
      .filter(i => {
        const attrs = `${i.getAttribute('name') || ''} ${i.getAttribute('id') || ''} ${i.getAttribute('autocomplete') || ''}`;
        return ccNames.test(attrs) || /cc-number/i.test(i.getAttribute('autocomplete') || '');
      });
    const ccRisky = ccFields.filter(f => (f.getAttribute('autocomplete') || '').toLowerCase() !== 'off');
    if (ccRisky.length > 0) {
      results.push({
        type: 'Sensitive Autocomplete',
        severity: 'Low',
        description: `${ccRisky.length} credit-card input(s) do not set autocomplete="off".`,
        location: pageUrl,
        recommendation: 'Set autocomplete="off" on credit-card inputs to avoid storing full PAN in browser profiles.'
      });
    }
  } catch (e) {}
  return results;
}
