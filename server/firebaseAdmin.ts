import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase Admin safely
let dbInstance: any;
let authInstance: any;
let storageInstance: any;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const fallbackProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    
    if (serviceAccountKey) {
      const parsedKey = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(parsedKey),
        projectId: parsedKey.project_id || fallbackProjectId,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || `${parsedKey.project_id}.appspot.com`
      });
      console.log('[Firebase] Admin SDK initialized with Service Account.');
    } else if (process.env.NODE_ENV === 'production') {
      // In production on Render/Railway, ADC will fail noisy. 
      // We force a mock-like state unless the key is provided to keep logs clean.
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in production environment.');
    } else {
      initializeApp({ 
        projectId: fallbackProjectId || 'minenode-hosting',
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket
      });
      console.log('[Firebase] Admin SDK initialized with default credentials.');
    }
  }
  dbInstance = getFirestore();
  authInstance = getAuth();
  storageInstance = getStorage();
} catch (error: any) {
  console.warn('[Firebase] Running in no-persistence mode (Admin SDK disabled).');
  
  const errorProxy = (name: string) => new Proxy({}, {
    get: (target, prop) => {
      return () => {
        throw new Error(`${name} operation "${String(prop)}" failed: Missing FIREBASE_SERVICE_ACCOUNT_KEY.`);
      };
    }
  });

  dbInstance = errorProxy('Firestore');
  authInstance = errorProxy('Auth');
  storageInstance = errorProxy('Storage');
}

export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;
export { FieldValue };
