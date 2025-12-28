import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hubplate.app',
  appName: 'Hubplate',
  webDir: 'public',
  server: {
    url: 'https://hubplate.app',
    cleartext: true,
    allowNavigation: ['hubplate.app', '*.hubplate.app', 'localhost']
  }
};

export default config;
