import { Request, Response, NextFunction } from 'express';

export function authorizeRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user || !user.role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

export default authorizeRoles;
