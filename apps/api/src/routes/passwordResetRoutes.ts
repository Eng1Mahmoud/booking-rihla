import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.ts';
import { createPasswordResetController } from '../controllers/passwordResetController.ts';
import type { PasswordResetService } from '../services/passwordResetService.ts';
export function createPasswordResetRouter(service: PasswordResetService) {
  const router = Router(),
    controller = createPasswordResetController(service);
  const limit = (count: number) =>
    rateLimit({
      limit: count,
      windowMs: 900000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many requests; try again later',
          ),
        ),
    });
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/forgot-password', limit(10), controller.forgot);
  router.post('/reset-password', limit(20), controller.reset);
  return router;
}
