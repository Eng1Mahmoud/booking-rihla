import type { RequestHandler } from 'express';
import { Router } from 'express';
import { createBusController } from '../controllers/busController.ts';
import type { BusService } from '../services/busService.ts';

export function createBusRouter(service: BusService, admin: RequestHandler[]) {
  const router = Router();
  router.use(...admin);
  const controller = createBusController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.get('/:id/seats', controller.listSeats);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
