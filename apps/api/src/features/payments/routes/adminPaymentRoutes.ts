import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';

import { adminPaymentStatisticsController } from '../controllers/adminPaymentStatisticsController.ts';
import { Router } from 'express';
import { adminPaymentController } from '../controllers/adminPaymentController.ts';

export const adminPaymentRouter = Router();
adminPaymentRouter.use(...adminMiddleware);
adminPaymentRouter.get('/', adminPaymentController.list);
adminPaymentRouter.get('/statistics', adminPaymentStatisticsController.get);
adminPaymentRouter.get('/:id', adminPaymentController.getById);
