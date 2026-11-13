import { Router, type RequestHandler } from 'express';
import { createAdminBookingController } from './adminBookingController.ts';
import type { AdminBookingService } from './adminBookingService.ts';

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
