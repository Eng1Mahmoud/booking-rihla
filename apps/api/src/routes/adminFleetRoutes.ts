import { Router, type RequestHandler } from 'express';
import { createAdminFleetController } from '../controllers/adminFleetController.ts';
import type { AdminFleetService } from '../services/adminFleetService.ts';

export function createAdminFleetRouter(
  service: AdminFleetService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createAdminFleetController(service);
  router.get('/bus-types', ...admin, controller.busTypes);
  router.get('/amenities', ...admin, controller.amenities);
  return router;
}
