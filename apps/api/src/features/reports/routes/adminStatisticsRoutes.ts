import { adminStatisticsLimiter } from '../../../middlewares/rateLimiters.ts';
import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';

import { Router } from 'express';

import { adminStatisticsController } from '../controllers/adminStatisticsController.ts';

export const adminStatisticsRouter = Router();
adminStatisticsRouter.use(...adminMiddleware);
adminStatisticsRouter.use(adminStatisticsLimiter);
adminStatisticsRouter.get('/', adminStatisticsController.get);
