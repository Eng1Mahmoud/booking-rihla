import type { RequestHandler } from 'express';
import { Router } from 'express';
import { createStationController } from './stationController.ts';
import type { StationService } from './stationService.ts';

export function createStationRouter(
  service: StationService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createStationController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', ...admin, controller.create);
  router.patch('/:id', ...admin, controller.update);
  router.delete('/:id', ...admin, controller.remove);

  return router;
}
