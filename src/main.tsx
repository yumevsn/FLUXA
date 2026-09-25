import React from 'react';
import { createRoot } from 'react-dom/client';

/* Ionic core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/flex-utils.css';

import './theme.css';
import App from './App';
import { initTheme } from './utils/theme';
import { isDesktopApp, isWeb } from './utils/platform';

initTheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (isDesktopApp()) {
  // The desktop window starts hidden (src-tauri/tauri.conf.json). Show it once
  // the first frame is painted so the app appears fully drawn, with no flash.
  requestAnimationFrame(() =>
    requestAnimationFrame(async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.show();
      await win.setFocus();
    })
  );
} else if (isWeb()) {
  // Offline support for the browser / installed PWA. The desktop and mobile
  // apps already ship their files locally, so they skip the service worker.
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
