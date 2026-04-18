// SQL Injection Scanner - Check for SQL error messages in page
function scanSQLInjection(pageUrl) {
  const results = [];
  const body = document.body?.textContent || '';
  const sqlErrors = /SQL syntax|mysql_fetch|ORA-\d+|syntax error.*SQL|ODBC.*Error|Warning.*mysql|Microsoft.*ODBC/i;
  if (sqlErrors.test(body)) {
    results.push({ type: 'SQL Injection', severity: 'Critical', description: 'SQL error messages found in page response.', location: pageUrl, recommendation: 'Hide database errors. Use parameterized queries.' });
  }
  return results;
}
