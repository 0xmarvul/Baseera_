// Cloud Storage Reference Scanner
// Detects references to cloud object storage (AWS S3, GCS, Azure Blob, R2)
// in the page HTML. The finding is informational on its own; it escalates
// (in wording, not severity) when the bucket name contains suspicious words
// like 'backup', 'private', 'internal', 'staging', 'dev', or 'dump'.
function scanCloudStorage(pageUrl) {
  const results = [];
  try {
    const html = document.documentElement.innerHTML || '';
    const cloudRe = /\b((?:[a-z0-9-]+\.)?s3[.-][a-z0-9-]+\.amazonaws\.com\/[a-z0-9._\-\/]*|storage\.googleapis\.com\/[a-z0-9._\-\/]+|[a-z0-9-]+\.blob\.core\.windows\.net\/[a-z0-9._\-\/]*|[a-z0-9-]+\.r2\.cloudflarestorage\.com\/[a-z0-9._\-\/]*)/gi;
    const cloudHits = new Set();
    let m;
    while ((m = cloudRe.exec(html)) !== null) cloudHits.add(m[0].slice(0, 140));

    if (cloudHits.size === 0) return results;

    const suspicious = [...cloudHits].filter(u => /(backup|private|internal|staging|dev|test|secret|dump|export)/i.test(u));
    const description = suspicious.length > 0
      ? `${cloudHits.size} cloud storage URL(s) referenced; ${suspicious.length} contain suspicious words (backup/private/internal/staging). Verify the bucket is not publicly listable and contains only intended-public assets.`
      : `${cloudHits.size} cloud storage URL(s) referenced. Verify the bucket is not publicly listable and contains only intended-public assets.`;

    results.push({
      type: 'Cloud Storage Reference',
      severity: 'Low',
      description,
      location: pageUrl,
      recommendation: "Confirm bucket policy is not public-readable for listing. On AWS S3, enable 'Block Public Access' and prefer signed URLs for private content. On GCS / Azure / R2, the equivalent controls are 'Uniform bucket-level access' (GCS) and disabling anonymous reads."
    });
  } catch (e) {}
  return results;
}
