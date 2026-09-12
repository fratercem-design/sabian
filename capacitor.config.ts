import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "xyz.psychesymbols.app",
  appName: "The Psyche Symbols",
  webDir: "dist-mobile",
  backgroundColor: "#0B1020",
  loggingBehavior: "none",
  appendUserAgent: " PsycheSymbolsMobile/1.0",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#0B1020",
    minWebViewVersion: 119,
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#0B1020",
    contentInset: "always",
    preferredContentMode: "mobile",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0B1020",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0B1020",
      overlaysWebView: false,
    },
  },
};

export default config;
