import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { cityController } from './cityController.ts';

export const cityRouter = Router();
cityRouter.get('/', cityController.list);
cityRouter.get('/:id', cityController.getById);
cityRouter.post('/', ...adminMiddleware, cityController.create);
cityRouter.patch('/:id', ...adminMiddleware, cityController.update);
cityRouter.delete('/:id', ...adminMiddleware, cityController.remove);
