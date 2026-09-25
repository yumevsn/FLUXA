import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.fluxa.app',
  appName: 'FLUXA',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    Camera: { permissions: ['camera', 'photos'] },
  },
};

export default config;
