import { Router, type RequestHandler } from 'express';
import { createAdminBusController } from '../controllers/adminBusController.ts';
import type { AdminBusService } from '../services/adminBusService.ts';
export function createAdminBusRouter(
  service: AdminBusService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.get('/buses', ...admin, createAdminBusController(service).list);
  return router;
}
