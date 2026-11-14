import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { stationController } from './stationController.ts';

export const stationRouter = Router();
stationRouter.get('/', stationController.list);
stationRouter.get('/:id', stationController.getById);
stationRouter.post('/', ...adminMiddleware, stationController.create);
stationRouter.patch('/:id', ...adminMiddleware, stationController.update);
stationRouter.delete('/:id', ...adminMiddleware, stationController.remove);
