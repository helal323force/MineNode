import { Request, Response, NextFunction } from 'express';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'wingxmc26@gmail.com';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// In-memory or fallback user limits store when backend Firestore admin SDK isn't present
export const userCustomLimits = new Map<string, { botLimit: number; featureLimit: number; isSuspended: boolean }>();

import { auth, db } from './firebaseAdmin.js';

export async function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty bearer token' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const email = decodedToken.email || '';
    const uid = decodedToken.uid;
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Fetch user profile from Firestore to check suspension/role
    const userDoc = await db.collection('users').doc(uid).get();
    let isSuspended = false;
    let actualRole: 'admin' | 'user' = isAdmin ? 'admin' : 'user';

    if (userDoc.exists) {
      const userData = userDoc.data();
      isSuspended = !!userData?.isSuspended;
      if (userData?.role) actualRole = userData.role;
    }

    if (isSuspended) {
      return res.status(403).json({ error: 'This user account has been suspended by an administrator.' });
    }

    req.user = {
      uid,
      email,
      role: actualRole,
    };
    return next();
  } catch (err: any) {
    return res.status(401).json({ error: `Authentication validation error: ${err.message}` });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}
