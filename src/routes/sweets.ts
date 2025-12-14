import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import authorizeRoles from '../middleware/authorize';
import { createHandler, listHandler, updateHandler, deleteHandler, purchaseHandler, restockHandler } from '../controllers/sweetsController';

const router = Router();

router.post('/', authMiddleware, authorizeRoles(['ADMIN']), createHandler);
router.get('/', authMiddleware, authorizeRoles(['ADMIN', 'USER']), listHandler);
router.put('/:id', authMiddleware, authorizeRoles(['ADMIN']), updateHandler);
router.delete('/:id', authMiddleware, authorizeRoles(['ADMIN']), deleteHandler);
router.post('/:id/purchase', authMiddleware, authorizeRoles(['ADMIN', 'USER']), purchaseHandler);
router.post('/:id/restock', authMiddleware, authorizeRoles(['ADMIN']), restockHandler);

export default router;
