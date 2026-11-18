import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { tripBatchController } from '../controllers/tripBatchController.ts';
import { Router } from 'express';
import { tripController } from '../controllers/tripController.ts';
import { tripSearchController } from '../controllers/tripSearchController.ts';
import { tripDetailsController } from '../controllers/tripDetailsController.ts';

export const tripRouter = Router();
tripRouter.post(
  '/batch/preview',
  ...adminMiddleware,
  tripBatchController.preview,
);
tripRouter.post('/batch', ...adminMiddleware, tripBatchController.create);
tripRouter.get('/', ...adminMiddleware, tripController.list);
tripRouter.get('/search', tripSearchController);
tripRouter.get('/:id/details', tripDetailsController.getById);
tripRouter.get('/:id/seats', tripDetailsController.listSeats);
tripRouter.get('/:id', ...adminMiddleware, tripController.getById);
tripRouter.post('/', ...adminMiddleware, tripController.create);
tripRouter.patch('/:id', ...adminMiddleware, tripController.update);
tripRouter.delete('/:id', ...adminMiddleware, tripController.remove);
