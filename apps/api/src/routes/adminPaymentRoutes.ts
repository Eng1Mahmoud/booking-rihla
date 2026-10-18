import { rateLimit } from 'express-rate-limit';
import { createAdminPaymentStatisticsController } from '../controllers/adminPaymentStatisticsController.ts';
import {
  adminPaymentStatisticsService,
  type AdminPaymentStatisticsService,
} from '../services/adminPaymentStatisticsService.ts';
import { Router, type RequestHandler } from 'express';
import { createAdminPaymentController } from '../controllers/adminPaymentController.ts';
import type { AdminPaymentService } from '../services/adminPaymentService.ts';
export function createAdminPaymentRouter(
  service: AdminPaymentService,
  admin: RequestHandler[],
  statistics: AdminPaymentStatisticsService = adminPaymentStatisticsService,
) {
  const router = Router();
  router.use(...admin);
  const controller = createAdminPaymentController(service);
  router.get('/', controller.list);
  router.get(
    '/statistics',
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many statistics requests',
        },
      },
    }),
    createAdminPaymentStatisticsController(statistics).get,
  );
  router.get('/:id', controller.getById);
  return router;
}
