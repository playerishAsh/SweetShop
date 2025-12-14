import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string | number;
  role: string;
  iat?: number;
  exp?: number;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers['authorization'];
    if (!auth || typeof auth !== 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, secret) as AuthPayload;

    // attach to request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: decoded.userId, role: decoded.role };

    return next();
  } catch (err) {
    // Always return generic unauthorized without leaking details
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export default authMiddleware;
