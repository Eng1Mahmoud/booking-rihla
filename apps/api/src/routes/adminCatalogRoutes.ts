import { Router, type RequestHandler } from 'express';
import { createAdminCatalogController } from '../controllers/adminCatalogController.ts';
import type { AdminCatalogService } from '../services/adminCatalogService.ts';

export function createAdminCatalogRouter(
  service: AdminCatalogService,
  admin: RequestHandler[],
) {
  const router = Router();
  const controller = createAdminCatalogController(service);
  router.get('/cities', ...admin, controller.cities);
  router.get('/stations', ...admin, controller.stations);
  return router;
}
