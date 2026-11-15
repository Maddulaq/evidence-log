import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sopproofhub.app',
  appName: 'SOP & Proof Hub',
  webDir: 'www',
  android: {
    allowMixedContent: false
  }
};

export default config;
