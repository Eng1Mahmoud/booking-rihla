import { Router, type RequestHandler } from 'express';
import { createBusTypeController } from '../controllers/busTypeController.ts';
import type { BusTypeService } from '../services/busTypeService.ts';
export function createBusTypeRouter(
  service: BusTypeService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createBusTypeController(service);
  router.use(...admin);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
