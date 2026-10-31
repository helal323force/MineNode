import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin safely
let dbInstance: any;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const fallbackProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey) {
      const parsedKey = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(parsedKey),
        projectId: parsedKey.project_id || fallbackProjectId,
      });
      console.log('Firebase Admin initialized with service account key.');
    } else {
      // In some environments (like GCP), we can try to initialize without explicit credentials
      initializeApp({
        projectId: fallbackProjectId
      });
      console.log('Firebase Admin initialized with default credentials.');
    }
  }
  dbInstance = getFirestore();
} catch (error: any) {
  console.error('**********************************************************');
  console.error('FIREBASE ADMIN ERROR:', error.message);
  console.error('If you are seeing "Unable to detect a Project Id":');
  console.error('1. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set in your environment variables.');
  console.error('2. Or set VITE_FIREBASE_PROJECT_ID as a fallback.');
  console.error('**********************************************************');
  
  // Export a proxy or mock if initialization fails to avoid crashing everything immediately
  dbInstance = new Proxy({}, {
    get: (target, prop) => {
      return () => {
        throw new Error(`Firestore operation "${String(prop)}" failed: Firebase Admin is not correctly initialized.`);
      };
    }
  });
}


export const db = dbInstance;
export { FieldValue };

