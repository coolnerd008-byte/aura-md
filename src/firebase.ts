import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK with check for existing instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if provided, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let firestore;
try {
  // Try to initialize with settings
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, databaseId);
} catch (e) {
  // If already initialized or fails, get the existing instance
  firestore = getFirestore(app, databaseId);
}

if (!firestore) {
  firestore = getFirestore(app);
}

export const db = firestore;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
