import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hubplate.app',
  appName: 'Hubplate',
  webDir: 'public',
  server: {
    url: 'https://hubplate.app', // POINT TO PRODUCTION FOR RELEASE
    cleartext: true
  }
};

export default config;
