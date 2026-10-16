import type { RequestHandler } from 'express';
import { Router } from 'express';
import { createRouteController } from '../controllers/routeController.ts';
import type { RouteService } from '../services/routeService.ts';

export function createRouteRouter(
  service: RouteService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.use(...admin);
  const controller = createRouteController(service);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
