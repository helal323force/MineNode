import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-CPX3R-MmTE9_qJn3hzgd6XVckHy_BRw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "minecraft-bot-hosting.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "minecraft-bot-hosting",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "minecraft-bot-hosting.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "477684008962",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:477684008962:web:84773428fe03375617ff1b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8E8Z2FGXVQ"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
};
export type { FirebaseUser };
