import { Router } from 'express';
import { createRouteController } from '../controllers/routeController.ts';
import type { RouteService } from '../services/routeService.ts';

export function createRouteRouter(service: RouteService) {
  const router = Router();
  const controller = createRouteController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
