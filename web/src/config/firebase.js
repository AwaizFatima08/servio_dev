// ─────────────────────────────────────────
// firebase.js — Firebase Web Configuration
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBXM67atMZEOkRNuxEysH6hVWOGQU7_17o',
  authDomain: 'servio-dev-55d2d.firebaseapp.com',
  projectId: 'servio-dev-55d2d',
  storageBucket: 'servio-dev-55d2d.appspot.com',
  messagingSenderId: '1074937348507',
  appId: '1:1074937348507:web:49281074ee73cfe920613e',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
