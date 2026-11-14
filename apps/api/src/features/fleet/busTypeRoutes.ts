import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { busTypeController } from './busTypeController.ts';

export const busTypeRouter = Router();
busTypeRouter.use(...adminMiddleware);
busTypeRouter.get('/', busTypeController.list);
busTypeRouter.get('/:id', busTypeController.getById);
busTypeRouter.post('/', busTypeController.create);
busTypeRouter.patch('/:id', busTypeController.update);
busTypeRouter.delete('/:id', busTypeController.remove);
