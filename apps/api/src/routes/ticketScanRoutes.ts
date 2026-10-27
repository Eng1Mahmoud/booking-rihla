import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.ts';
import { createTicketScanController } from '../controllers/ticketScanController.ts';
import {
  ticketScanService,
  type TicketScanService,
} from '../services/ticketScanService.ts';

export function createTicketScanRouter(
  admin: RequestHandler[],
  service: TicketScanService = ticketScanService,
) {
  const router = Router();
  const controller = createTicketScanController(service);
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, _response, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many scan attempts')),
  });

  // Staff / admin gate: authenticated ADMIN or SUPER_ADMIN only.
  router.post('/scan', ...admin, limiter, controller.scan);
  return router;
}
