import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { operationController } from '../controllers/operationController.ts';
export function createOperationRouter(superAdmin: RequestHandler[]) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many operation requests' },
    },
  });
  router.post(
    '/trips/:id/cancel',
    ...superAdmin,
    limiter,
    operationController.cancel,
  );
  router.get(
    '/refunds',
    ...superAdmin,
    limiter,
    operationController.listRefunds,
  );
  router.get(
    '/refunds/statistics',
    ...superAdmin,
    limiter,
    operationController.refundStatistics,
  );
  router.get(
    '/refunds/:id',
    ...superAdmin,
    limiter,
    operationController.getRefund,
  );
  router.post(
    '/refunds/:id/issue',
    ...superAdmin,
    limiter,
    operationController.issueRefund,
  );
  router.post(
    '/refunds/:id/reconcile',
    ...superAdmin,
    limiter,
    operationController.reconcileRefund,
  );
  return router;
}
