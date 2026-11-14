import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { routeController } from './routeController.ts';

export const routeRouter = Router();
routeRouter.use(...adminMiddleware);
routeRouter.get('/', routeController.list);
routeRouter.get('/:id', routeController.getById);
routeRouter.post('/', routeController.create);
routeRouter.patch('/:id', routeController.update);
routeRouter.delete('/:id', routeController.remove);
