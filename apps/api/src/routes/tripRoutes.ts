import { createTripBatchController } from '../controllers/tripBatchController.ts';
import {
  tripBatchService,
  type TripBatchService,
} from '../services/tripBatchService.ts';
import type { RequestHandler } from 'express';
import { Router } from 'express';
import { createTripController } from '../controllers/tripController.ts';
import type { TripService } from '../services/tripService.ts';

import { createTripSearchController } from '../controllers/tripSearchController.ts';
import {
  tripSearchService,
  type TripSearchService,
} from '../services/tripSearchService.ts';

import { createTripDetailsController } from '../controllers/tripDetailsController.ts';
import {
  tripDetailsService,
  type TripDetailsService,
} from '../services/tripDetailsService.ts';

export function createTripRouter(
  service: TripService,
  admin: RequestHandler[],
  searchService: TripSearchService = tripSearchService,
  detailsService: TripDetailsService = tripDetailsService,
  batches: TripBatchService = tripBatchService,
) {
  const router = Router();
  const controller = createTripController(service);
  const detailsController = createTripDetailsController(detailsService);

  const batchController = createTripBatchController(batches);
  router.post('/batch/preview', ...admin, batchController.preview);
  router.post('/batch', ...admin, batchController.create);

  router.get('/', ...admin, controller.list);
  router.get('/search', createTripSearchController(searchService));
  router.get('/:id/details', detailsController.getById);
  router.get('/:id/seats', detailsController.listSeats);
  router.get('/:id', ...admin, controller.getById);
  router.post('/', ...admin, controller.create);
  router.patch('/:id', ...admin, controller.update);
  router.delete('/:id', ...admin, controller.remove);

  return router;
}
