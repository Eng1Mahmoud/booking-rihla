import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminFleetController } from './adminFleetController.ts';

export const adminFleetRouter = Router();
adminFleetRouter.get(
  '/bus-types',
  ...adminMiddleware,
  adminFleetController.busTypes,
);
adminFleetRouter.get(
  '/amenities',
  ...adminMiddleware,
  adminFleetController.amenities,
);
