import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { busController } from './busController.ts';

export const busRouter = Router();
busRouter.use(...adminMiddleware);
busRouter.get('/', busController.list);
busRouter.get('/:id', busController.getById);
busRouter.get('/:id/seats', busController.listSeats);
busRouter.post('/', busController.create);
busRouter.patch('/:id', busController.update);
busRouter.delete('/:id', busController.remove);
