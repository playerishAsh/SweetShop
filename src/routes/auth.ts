import { Router } from 'express';
import { registerHandler } from '../controllers/authController';

const router = Router();

router.post('/register', registerHandler);

export default router;
