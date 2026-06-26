/**
 * Firebase configuration
 * Uses the default Firestore database for maximum compatibility.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJ5x_1AHdFdgiuozpAmmFSMa9iyHZe2jE",
  authDomain: "gen-lang-client-0831498778.firebaseapp.com",
  projectId: "gen-lang-client-0831498778",
  storageBucket: "gen-lang-client-0831498778.firebasestorage.app",
  messagingSenderId: "635930977062",
  appId: "1:635930977062:web:88220aa6292d16529a57e7",
};

// Prevent duplicate app initialization in HMR / StrictMode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
