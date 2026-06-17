// app.config.js
// ─────────────────────────────────────────────────────────────
// SERVIO MOBILE — dev/prod environment switch
//
// Replaces app.json. Expo reads this file at BUILD time.
// The environment is chosen by process.env.APP_ENV, which is set
// per-profile in eas.json:
//     APP_ENV = 'dev'   -> dev project, package org.homilabs.servio
//     APP_ENV = 'prod'  -> prod project, package com.homilabs.servio
//
// Local `expo start` (no APP_ENV set) defaults to 'dev' — safe default,
// same principle as .firebaserc default = dev.
//
// Everything not environment-specific (icons, splash, plugins, EAS
// projectId, owner, version) is identical to the old app.json.
// ─────────────────────────────────────────────────────────────

const APP_ENV = process.env.APP_ENV === 'prod' ? 'prod' : 'dev';

// ─── Per-environment values ───
const ENV = {
  dev: {
    name: 'Servio Dev',
    androidPackage: 'org.homilabs.servio',
    iosBundleId: 'org.homilabs.servio',
    googleServicesFile: './google-services.dev.json',
    apiUrl: 'https://asia-south1-servio-dev-55d2d.cloudfunctions.net/api',
    firebase: {
      apiKey: 'AIzaSyCNEDbUEz02_KJbfJ8PSr2PBDkIXQFqixI',
      authDomain: 'servio-dev-55d2d.firebaseapp.com',
      projectId: 'servio-dev-55d2d',
      storageBucket: 'servio-dev-55d2d.firebasestorage.app',
      messagingSenderId: '1074937348507',
      appId: '1:1074937348507:android:ba7486e7716644e320613e',
    },
  },
  prod: {
    name: 'Servio',
    androidPackage: 'com.homilabs.servio',
    iosBundleId: 'com.homilabs.servio',
    googleServicesFile: './google-services.prod.json',
    apiUrl: 'https://asia-south1-servio-prod-3a6de.cloudfunctions.net/api',
    firebase: {
      // ▼▼▼ FILL THESE FROM PROD google-services.json / prod console ▼▼▼
      apiKey: 'AIzaSyC_CMlrNBFIPdxWUumQIn69REmN68zBOoY',
      authDomain: 'servio-prod-3a6de.firebaseapp.com',
      projectId: 'servio-prod-3a6de',
      storageBucket: 'servio-prod-3a6de.firebasestorage.app',   // likely servio-prod-3a6de.firebasestorage.app — confirm
      messagingSenderId: '1023245562378',
      appId: '1:1023245562378:android:10a1e865bb4519c3f525f3',
      // ▲▲▲ apiKey + storageBucket are the two you must paste ▲▲▲
    },
  },
};

const current = ENV[APP_ENV];

export default {
  expo: {
    name: current.name,
    slug: 'servio',
    scheme: 'servio',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: current.iosBundleId,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#EBF9F4',
      },
      package: current.androidPackage,
      googleServicesFile: current.googleServicesFile,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      appEnv: APP_ENV,
      apiUrl: current.apiUrl,
      firebaseConfig: current.firebase,
      eas: {
        projectId: '36fa5931-2c0e-4113-a3ac-9672a3a8bea5',
      },
    },
    owner: 'homi55',
    plugins: [
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#EBF9F4',
        },
      ],
    ],
  },
};
