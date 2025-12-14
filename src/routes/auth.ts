import { Router } from 'express';
import { registerHandler } from '../controllers/authController';
import { loginHandler } from '../controllers/loginController';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);

export default router;
