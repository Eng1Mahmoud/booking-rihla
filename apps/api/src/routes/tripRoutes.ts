import { Router } from 'express';
import { createTripController } from '../controllers/tripController.ts';
import type { TripService } from '../services/tripService.ts';

export function createTripRouter(service: TripService) {
  const router = Router();
  const controller = createTripController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
