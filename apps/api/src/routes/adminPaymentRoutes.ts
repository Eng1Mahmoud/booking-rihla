import { Router, type RequestHandler } from 'express';
import { createAdminPaymentController } from '../controllers/adminPaymentController.ts';
import type { AdminPaymentService } from '../services/adminPaymentService.ts';
export function createAdminPaymentRouter(
  service: AdminPaymentService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.use(...admin);
  const controller = createAdminPaymentController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  return router;
}
