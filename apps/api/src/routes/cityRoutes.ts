import type { RequestHandler } from 'express';
import { Router } from 'express';
import { createCityController } from '../controllers/cityController.ts';
import type { CityService } from '../services/cityService.ts';

export function createCityRouter(
  service: CityService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createCityController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', ...admin, controller.create);
  router.patch('/:id', ...admin, controller.update);
  router.delete('/:id', ...admin, controller.remove);

  return router;
}
