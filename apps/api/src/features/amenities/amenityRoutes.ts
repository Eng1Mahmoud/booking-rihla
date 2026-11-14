import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { amenityController } from './amenityController.ts';

export const amenityRouter = Router();
amenityRouter.use(...adminMiddleware);
amenityRouter.get('/', amenityController.list);
amenityRouter.get('/:id', amenityController.getById);
amenityRouter.post('/', amenityController.create);
amenityRouter.patch('/:id', amenityController.update);
amenityRouter.delete('/:id', amenityController.remove);
