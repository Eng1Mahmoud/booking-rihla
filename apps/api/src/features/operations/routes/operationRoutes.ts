import { operationLimiter } from '../../../middlewares/rateLimiters.ts';
import { superAdminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';

import { Router } from 'express';

import { operationController } from '../controllers/operationController.ts';
export const operationRouter = Router();

operationRouter.post(
  '/trips/:id/cancel',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.cancel,
);
operationRouter.get(
  '/refunds',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.listRefunds,
);
operationRouter.get(
  '/refunds/statistics',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.refundStatistics,
);
operationRouter.get(
  '/refunds/:id',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.getRefund,
);
operationRouter.post(
  '/refunds/:id/issue',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.issueRefund,
);
operationRouter.post(
  '/refunds/:id/reconcile',
  ...superAdminMiddleware,
  operationLimiter,
  operationController.reconcileRefund,
);
