import { superAdminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';

import { Router } from 'express';

import { operationController } from '../controllers/operationController.ts';
export const operationRouter = Router();

operationRouter.post(
  '/trips/:id/cancel',
  ...superAdminMiddleware,
  operationController.cancel,
);
operationRouter.get(
  '/refunds',
  ...superAdminMiddleware,
  operationController.listRefunds,
);
operationRouter.get(
  '/refunds/statistics',
  ...superAdminMiddleware,
  operationController.refundStatistics,
);
operationRouter.get(
  '/refunds/:id',
  ...superAdminMiddleware,
  operationController.getRefund,
);
operationRouter.post(
  '/refunds/:id/issue',
  ...superAdminMiddleware,
  operationController.issueRefund,
);
operationRouter.post(
  '/refunds/:id/reconcile',
  ...superAdminMiddleware,
  operationController.reconcileRefund,
);
