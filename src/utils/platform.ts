import { Capacitor } from '@capacitor/core';

/** Running inside the Tauri desktop app (Windows, macOS, Linux). */
export const isDesktopApp = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Running as the Android / iOS app. */
export const isMobileApp = (): boolean => Capacitor.isNativePlatform();

/** Plain browser / installed PWA. */
export const isWeb = (): boolean => !isDesktopApp() && !isMobileApp();

/**
 * Open a link in the user's browser. The desktop app has no browser tabs of
 * its own, so links go to the system browser there.
 */
export const openExternal = async (url: string): Promise<void> => {
  if (isDesktopApp()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
