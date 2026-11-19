import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';

import { Router } from 'express';

import { adminStatisticsController } from '../controllers/adminStatisticsController.ts';

export const adminStatisticsRouter = Router();
adminStatisticsRouter.use(...adminMiddleware);
adminStatisticsRouter.get('/', adminStatisticsController.get);
