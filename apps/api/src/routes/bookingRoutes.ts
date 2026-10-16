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
) {
  const router = Router();
  const controller = createBookingController(service);
  router.use(requireAuth(sessions));
  router.post(
    '/',
    rateLimit({
      limit: 20,
      windowMs: 60000,
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
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  // Passenger cancellation is deliberately unavailable: no DELETE/PATCH/cancel route.
  return router;
}
