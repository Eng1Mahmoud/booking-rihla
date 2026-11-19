import { ticketController } from '../../tickets/controllers/ticketController.ts';
import { paymentCheckoutController } from '../../payments/controllers/paymentCheckoutController.ts';
import { paymentAttemptController } from '../../payments/controllers/paymentAttemptController.ts';
import { Router } from 'express';

import { requireAuth } from '../../../middlewares/authorizationMiddleware.ts';

import { bookingController } from '../controllers/bookingController.ts';

export const bookingRouter = Router();
bookingRouter.use(requireAuth);
bookingRouter.post('/', bookingController.create);
bookingRouter.post('/:id/payment-attempt', paymentAttemptController.prepare);
bookingRouter.get('/:id/payment-attempt', paymentAttemptController.get);
bookingRouter.post('/:id/payment/refresh', paymentCheckoutController.refresh);
bookingRouter.post('/:id/checkout', paymentCheckoutController.start);
bookingRouter.get('/:id/payment', paymentCheckoutController.get);
bookingRouter.get('/:id/ticket', ticketController);
bookingRouter.get('/', bookingController.list);
bookingRouter.get('/:id', bookingController.getById);
