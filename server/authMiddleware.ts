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

export function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty bearer token' });
  }

  try {
    // Attempt decoding Firebase JWT payload (header.payload.signature)
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      const email = payload.email || '';
      const uid = payload.user_id || payload.sub || payload.uid;
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Check if suspended
      const custom = userCustomLimits.get(uid);
      if (custom && custom.isSuspended) {
        return res.status(403).json({ error: 'This user account has been suspended by an administrator.' });
      }

      req.user = {
        uid,
        email,
        role: isAdmin ? 'admin' : 'user',
      };
      return next();
    }

    // Direct fallback for developer mode
    return res.status(401).json({ error: 'Invalid authentication credentials' });
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
