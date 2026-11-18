import {
  bookingLimiter,
  paymentAttemptLimiter,
  paymentAttemptStatusLimiter,
  paymentRefreshLimiter,
  checkoutLimiter,
  paymentStatusLimiter,
  ticketDownloadLimiter,
} from '../../../middlewares/rateLimiters.ts';

import { ticketController } from '../../tickets/controllers/ticketController.ts';
import { paymentCheckoutController } from '../../payments/controllers/paymentCheckoutController.ts';
import { paymentAttemptController } from '../../payments/controllers/paymentAttemptController.ts';
import { Router } from 'express';

import { requireAuth } from '../../../middlewares/requireAuth.ts';

import { bookingController } from '../controllers/bookingController.ts';

export const bookingRouter = Router();
bookingRouter.use(requireAuth);
bookingRouter.post('/', bookingLimiter, bookingController.create);
bookingRouter.post(
  '/:id/payment-attempt',
  paymentAttemptLimiter,
  paymentAttemptController.prepare,
);
bookingRouter.get(
  '/:id/payment-attempt',
  paymentAttemptStatusLimiter,
  paymentAttemptController.get,
);
bookingRouter.post(
  '/:id/payment/refresh',
  paymentRefreshLimiter,
  paymentCheckoutController.refresh,
);
bookingRouter.post(
  '/:id/checkout',
  checkoutLimiter,
  paymentCheckoutController.start,
);
bookingRouter.get(
  '/:id/payment',
  paymentStatusLimiter,
  paymentCheckoutController.get,
);
bookingRouter.get('/:id/ticket', ticketDownloadLimiter, ticketController);
bookingRouter.get('/', bookingController.list);
bookingRouter.get('/:id', bookingController.getById);
