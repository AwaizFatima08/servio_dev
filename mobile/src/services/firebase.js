import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCNEDbUEz02_KJbfJ8PSr2PBDkIXQFqixI',
  authDomain: 'servio-dev-55d2d.firebaseapp.com',
  projectId: 'servio-dev-55d2d',
  storageBucket: 'servio-dev-55d2d.firebasestorage.app',
  messagingSenderId: '1074937348507',
  appId: '1:1074937348507:android:ba7486e7716644e320613e',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
