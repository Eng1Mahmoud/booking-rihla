import { adminPaymentStatisticsLimiter } from '../../middlewares/rateLimiters.ts';
import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';

import { adminPaymentStatisticsController } from './adminPaymentStatisticsController.ts';
import { Router } from 'express';
import { adminPaymentController } from './adminPaymentController.ts';

export const adminPaymentRouter = Router();
adminPaymentRouter.use(...adminMiddleware);
adminPaymentRouter.get('/', adminPaymentController.list);
adminPaymentRouter.get(
  '/statistics',
  adminPaymentStatisticsLimiter,
  adminPaymentStatisticsController.get,
);
adminPaymentRouter.get('/:id', adminPaymentController.getById);
