import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let dbInstance: any;

function createUnavailableFirestore(reason: string) {
  console.warn(`[Firebase] Firestore unavailable: ${reason}`);
  return new Proxy({}, {
    get: (_target, prop) => {
      return () => {
        throw new Error(
          `Firestore is unavailable. Configure FIREBASE_SERVICE_ACCOUNT_KEY in the hosting provider environment. (${String(prop)})`
        );
      };
    },
  });
}

try {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const fallbackProjectId =
    process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountRaw || !serviceAccountRaw.trim()) {
    // Avoid attempting Google metadata-server credentials on hosted Node services.
    dbInstance = createUnavailableFirestore(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set; server is running without Firestore persistence.'
    );
  } else {
    const serviceAccount = JSON.parse(serviceAccountRaw);

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY must contain project_id, client_email and private_key.'
      );
    }

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: String(serviceAccount.private_key).replace(/\\n/g, '\n'),
        }),
        projectId: serviceAccount.project_id || fallbackProjectId,
      });
    }

    dbInstance = getFirestore();
    console.log('[Firebase] Admin SDK initialized with Service Account.');
  }
} catch (error: any) {
  dbInstance = createUnavailableFirestore(
    error?.message || 'Invalid Firebase service account configuration.'
  );
}

export const db = dbInstance;
export { FieldValue };
