import { Router, Request, Response } from 'express';

const router = Router();

// Extract handler for clearer code and easier unit testing
export function pingHandler(_req: Request, res: Response) {
  res.json({ pong: true });
}

router.get('/', pingHandler);

export default router;
