import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAdminStatisticsController } from '../controllers/adminStatisticsController.ts';
import type { AdminStatisticsService } from '../services/adminStatisticsService.ts';
export function createAdminStatisticsRouter(
  service: AdminStatisticsService,
  admin: RequestHandler[],
) {
  const router = Router();
  router.use(...admin);
  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  router.get('/', createAdminStatisticsController(service).get);
  return router;
}
