import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin safely
let dbInstance: any;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });
      console.log('Firebase Admin initialized with service account key.');
    } else {
      // In some environments (like GCP), we can try to initialize without explicit credentials
      initializeApp();
      console.log('Firebase Admin initialized with default credentials.');
    }
  }
  dbInstance = getFirestore();
} catch (error: any) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  // Export a proxy or mock if initialization fails to avoid crashing everything immediately
  dbInstance = new Proxy({}, {
    get: () => {
      throw new Error('Firestore is not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY.');
    }
  });
}

export const db = dbInstance;
export { FieldValue };

