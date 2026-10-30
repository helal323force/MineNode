import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider, 
  fbSignOut,
  FirebaseUser,
  db,
  doc,
  getDoc,
  setDoc
} from '../firebase.js';
import { UserAccount } from '../types.js';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  account: UserAccount | null;
  isAdmin: boolean;
  loading: boolean;
  token: string | null;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Authenticated fetch helper automatically attaching Authorization Bearer header
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token;
    if (currentUser) {
      try {
        currentToken = await currentUser.getIdToken();
        setToken(currentToken);
      } catch (e) {
        // use existing token
      }
    }

    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    return fetch(url, { ...options, headers });
  };

  const syncBackendAccount = async (user: FirebaseUser) => {
    try {
      const userToken = await user.getIdToken();
      setToken(userToken);

      // Verify on backend
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (res.ok) {
        const backendUser = await res.json();
        const userAcc: UserAccount = {
          uid: backendUser.uid,
          email: backendUser.email,
          displayName: user.displayName || backendUser.email.split('@')[0],
          role: backendUser.role,
          botLimit: backendUser.botLimit || 3,
          featureLimit: backendUser.featureLimit || 5,
          isSuspended: !!backendUser.isSuspended,
          activeBotsCount: backendUser.activeBotsCount || 0,
        };
        setAccount(userAcc);

        // Also sync profile in Firestore if not present
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              role: backendUser.role,
              botLimit: backendUser.botLimit || 3,
              featureLimit: backendUser.featureLimit || 5,
              isSuspended: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (dbErr) {
          // Fallback gracefully
        }
      } else {
        // Fallback for user representation
        const isAdmin = (user.email || '').toLowerCase() === 'wingxmc26@gmail.com';
        setAccount({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: isAdmin ? 'admin' : 'user',
          botLimit: isAdmin ? 999 : 3,
          featureLimit: isAdmin ? 999 : 5,
          isSuspended: false,
        });
      }
    } catch (err) {
      const isAdmin = (user.email || '').toLowerCase() === 'wingxmc26@gmail.com';
      setAccount({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: isAdmin ? 'admin' : 'user',
        botLimit: isAdmin ? 999 : 3,
        featureLimit: isAdmin ? 999 : 5,
        isSuspended: false,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncBackendAccount(user);
      } else {
        setAccount(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await syncBackendAccount(cred.user);
  };

  const registerWithEmail = async (email: string, pass: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await syncBackendAccount(cred.user);
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncBackendAccount(cred.user);
  };

  const logout = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
    setAccount(null);
    setToken(null);
  };

  const refreshAccount = async () => {
    if (currentUser) {
      await syncBackendAccount(currentUser);
    }
  };

  const isAdmin = account?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        account,
        isAdmin,
        loading,
        token,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        refreshAccount,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
