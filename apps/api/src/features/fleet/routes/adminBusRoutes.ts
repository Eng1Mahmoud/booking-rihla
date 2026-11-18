import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminBusController } from '../controllers/adminBusController.ts';

export const adminBusRouter = Router();
adminBusRouter.get('/buses', ...adminMiddleware, adminBusController.list);
