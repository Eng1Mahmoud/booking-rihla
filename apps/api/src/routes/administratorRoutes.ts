import { Router, type RequestHandler } from 'express';
import { createAdministratorController } from '../controllers/administratorController.ts';
import type { AdministratorService } from '../services/administratorService.ts';
export function createAdministratorRouter(
  service: AdministratorService,
  superAdmin: RequestHandler[],
) {
  const router = Router();
  router.use(...superAdmin);
  const controller = createAdministratorController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id/role', controller.updateRole);
  router.patch('/:id/status', controller.updateStatus);
  return router;
}
