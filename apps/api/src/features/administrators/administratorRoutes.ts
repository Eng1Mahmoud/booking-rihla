import { superAdminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { administratorController } from './administratorController.ts';

export const administratorRouter = Router();
administratorRouter.use(...superAdminMiddleware);
administratorRouter.get('/', administratorController.list);
administratorRouter.get('/:id', administratorController.getById);
administratorRouter.patch('/:id/role', administratorController.updateRole);
administratorRouter.patch('/:id/status', administratorController.updateStatus);
