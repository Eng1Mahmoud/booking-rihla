import { Router, type RequestHandler } from 'express';
import { createAmenityController } from '../controllers/amenityController.ts';
import type { AmenityService } from '../services/amenityService.ts';
export function createAmenityRouter(
  service: AmenityService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createAmenityController(service);
  router.use(...admin);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
