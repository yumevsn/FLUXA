export type ThemePref = 'system' | 'light' | 'dark';

// Keep in sync with the inline script in index.html
const KEY = 'fluxa.theme';

export const getThemePref = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

/** Sets <html data-theme> (absent = follow the system) and the browser UI colour. */
export const applyTheme = (pref: ThemePref) => {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;

  const dark = pref === 'dark' || (pref === 'system' && !!darkQuery()?.matches);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#141613' : '#2D5A3D');
};

export const setThemePref = (pref: ThemePref) => {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage unavailable — the choice still applies for this session
  }
  applyTheme(pref);
};

/** Apply the saved theme and follow system changes while on "system". */
export const initTheme = () => {
  applyTheme(getThemePref());
  darkQuery()?.addEventListener?.('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
  });
};
