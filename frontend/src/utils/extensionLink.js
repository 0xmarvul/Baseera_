// Single source of truth for the Chrome Web Store URL.
// Used by every "Install / Download / Get the Extension" CTA across
// the site so the URL only needs to change in one place if we ever
// rebrand or move listings (e.g. add Firefox / Edge add-on stores).

export const WEBSTORE_URL =
  'https://chromewebstore.google.com/detail/baseera-security-scanner/inapmbneppfcjdbagkgmgnkghkkceade';

// Standard props for an external link CTA. `rel="noopener noreferrer"`
// prevents the new tab from gaining `window.opener` access back to us
// (would be a tabnabbing vector if the destination ever got hijacked).
export const WEBSTORE_LINK_PROPS = {
  href: WEBSTORE_URL,
  target: '_blank',
  rel: 'noopener noreferrer',
};
