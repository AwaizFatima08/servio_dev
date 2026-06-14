// ─────────────────────────────────────────
// firebase.js — Firebase Web Configuration
// HomiLabs | Servio | Web
//
// Config values are NOT hardcoded here. They come from the Vite
// environment file (.env.development or .env.production) chosen
// automatically at build time. Build for dev → dev project.
// Build for prod → prod project. No code edit to switch.
// ─────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Safety net: if the env file is missing or a key is misnamed, fail
// loudly at startup instead of connecting to "undefined" and showing
// confusing auth errors later.
if (!firebaseConfig.projectId) {
  throw new Error(
    'Firebase config is not set. Check that .env.development / .env.production ' +
    'defines VITE_FIREBASE_* values.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;