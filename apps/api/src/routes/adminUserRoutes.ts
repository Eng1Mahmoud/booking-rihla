import { Router, type RequestHandler } from 'express';
import { createAdminUserController } from '../controllers/adminUserController.ts';
import type { AdminUserService } from '../services/adminUserService.ts';

export function createAdminUserRouter(
  service: AdminUserService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.use(...admin);
  const controller = createAdminUserController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id/status', controller.updateStatus);
  return router;
}
