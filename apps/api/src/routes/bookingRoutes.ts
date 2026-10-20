import { userRateLimitKey } from '../utils/clientIdentity.ts';
import { createTicketController } from '../controllers/ticketController.ts';
import {
  ticketService,
  type TicketService,
} from '../services/ticketService.ts';
import { createPaymentCheckoutController } from '../controllers/paymentCheckoutController.ts';
import {
  paymentCheckoutService,
  type PaymentCheckoutService,
} from '../services/paymentCheckoutService.ts';
import { createPaymentAttemptController } from '../controllers/paymentAttemptController.ts';
import {
  paymentAttemptService,
  type PaymentAttemptService,
} from '../services/paymentAttemptService.ts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middlewares/requireAuth.ts';
import { AppError } from '../errors/AppError.ts';
import { createBookingController } from '../controllers/bookingController.ts';
import type { BookingService } from '../services/bookingService.ts';
import type { SessionService } from '../services/sessionService.ts';
export function createBookingRouter(
  service: BookingService,
  sessions: SessionService,
  payments: PaymentAttemptService = paymentAttemptService,
  checkout: PaymentCheckoutService = paymentCheckoutService,
  tickets: TicketService = ticketService,
) {
  const router = Router();
  const controller = createBookingController(service);
  router.use(requireAuth(sessions));
  router.post(
    '/',
    rateLimit({
      limit: 20,
      windowMs: 60000,
      keyGenerator: userRateLimitKey,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many reservations; try again later',
          ),
        ),
    }),
    controller.create,
  );
  const paymentController = createPaymentAttemptController(payments);
  router.post('/:id/payment-attempt', paymentController.prepare);
  router.get('/:id/payment-attempt', paymentController.get);
  const checkoutController = createPaymentCheckoutController(checkout);
  router.post(
    '/:id/payment/refresh',
    rateLimit({
      limit: 6,
      windowMs: 60000,
      keyGenerator: userRateLimitKey,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, _response, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Wait before checking payment again',
          ),
        ),
    }),
    checkoutController.refresh,
  );
  router.post(
    '/:id/checkout',
    rateLimit({
      limit: 20,
      windowMs: 60000,
      keyGenerator: userRateLimitKey,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many checkout requests; try again later',
          ),
        ),
    }),
    checkoutController.start,
  );
  router.get(
    '/:id/payment',
    rateLimit({
      limit: 120,
      windowMs: 60000,
      keyGenerator: userRateLimitKey,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many payment status requests; try again later',
          ),
        ),
    }),
    checkoutController.get,
  );
  router.get(
    '/:id/ticket',
    rateLimit({
      limit: 60,
      windowMs: 60000,
      keyGenerator: userRateLimitKey,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many ticket requests; try again later',
          ),
        ),
    }),
    createTicketController(tickets),
  );
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  // Passenger cancellation is deliberately unavailable: no DELETE/PATCH/cancel route.
  return router;
}
