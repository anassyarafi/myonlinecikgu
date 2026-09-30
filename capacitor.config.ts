import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myonlinecikgu.app',
  appName: 'MyOnlineCikgu',
  webDir: 'public',
  server: {
    url: 'https://myonlinecikgu.vercel.app',
    cleartext: false
  }
};

export default config;