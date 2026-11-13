import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../errors/AppError.ts';
import { createTicketScanController } from './ticketScanController.ts';
import {
  ticketScanService,
  type TicketScanService,
} from './ticketScanService.ts';

export function createTicketScanRouter(
  staff: RequestHandler[],
  service: TicketScanService = ticketScanService,
) {
  const router = Router();
  const controller = createTicketScanController(service);
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, _response, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many scan attempts')),
  });

  // STAFF, ADMIN, SUPER_ADMIN (caller wires requireRole).
  router.post('/scan', ...staff, limiter, controller.scan);
  return router;
}
