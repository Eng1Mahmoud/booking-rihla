import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminBookingController } from '../controllers/adminBookingController.ts';

export const adminBookingRouter = Router();
adminBookingRouter.use(...adminMiddleware);
adminBookingRouter.get('/', adminBookingController.list);
adminBookingRouter.get('/:id', adminBookingController.getById);
