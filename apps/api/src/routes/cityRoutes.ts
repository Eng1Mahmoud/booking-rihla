import { Router } from 'express';
import { createCityController } from '../controllers/cityController.ts';
import type { CityService } from '../services/cityService.ts';

export function createCityRouter(service: CityService) {
  const router = Router();
  const controller = createCityController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
