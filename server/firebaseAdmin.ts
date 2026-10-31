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
      console.log('[Firebase] Admin SDK initialized with Service Account.');
    } else {
      initializeApp({ projectId: fallbackProjectId || 'minenode-hosting' });
      console.log('[Firebase] Admin SDK initialized with default credentials.');
    }
  }
  dbInstance = getFirestore();
} catch (error: any) {
  console.warn('[Firebase] Running in no-persistence mode (Firestore disabled).');
  
  dbInstance = new Proxy({}, {
    get: (target, prop) => {
      return () => {
        throw new Error(`Firestore operation "${String(prop)}" failed: Missing FIREBASE_SERVICE_ACCOUNT_KEY.`);
      };
    }
  });
}



export const db = dbInstance;
export { FieldValue };

