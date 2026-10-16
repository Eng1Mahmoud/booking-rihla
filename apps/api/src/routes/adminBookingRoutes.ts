import { Router, type RequestHandler } from 'express';
import { createAdminBookingController } from '../controllers/adminBookingController.ts';
import type { AdminBookingService } from '../services/adminBookingService.ts';

export function createAdminBookingRouter(
  service: AdminBookingService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.use(...admin);
  const controller = createAdminBookingController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  return router;
}
