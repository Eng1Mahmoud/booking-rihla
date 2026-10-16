import { Router } from 'express';
import { createStationController } from '../controllers/stationController.ts';
import type { StationService } from '../services/stationService.ts';

export function createStationRouter(service: StationService) {
  const router = Router();
  const controller = createStationController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
