import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminUserController } from '../controllers/adminUserController.ts';

export const adminUserRouter = Router();
adminUserRouter.use(...adminMiddleware);
adminUserRouter.get('/', adminUserController.list);
adminUserRouter.get('/:id', adminUserController.getById);
adminUserRouter.patch('/:id/status', adminUserController.updateStatus);
