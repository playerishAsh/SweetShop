import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// Lazy-load controller to avoid importing DB-related modules at app startup.
// This keeps non-auth tests from failing when DATABASE_URL is not set.
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { registerHandler } = require('../controllers/authController');
	return registerHandler(req, res, next);
});

export default router;
