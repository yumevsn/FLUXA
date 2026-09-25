// Apply the saved theme before first paint so there is no flash of the wrong
// theme (see src/utils/theme.ts). Kept as a file, not an inline script, so the
// desktop app's Content Security Policy doesn't need 'unsafe-inline'.
try {
  var t = localStorage.getItem('fluxa.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {
  /* storage unavailable */
}
