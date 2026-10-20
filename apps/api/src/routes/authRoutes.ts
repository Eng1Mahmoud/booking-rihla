import { clientRateLimitKey } from '../utils/clientIdentity.ts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.ts';
import { createAuthController } from '../controllers/authController.ts';
import type { AuthService } from '../services/authService.ts';
function authLimit(limit: number, windowMs: number) {
  return rateLimit({
    limit,
    windowMs,
    keyGenerator: clientRateLimitKey,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, _response, next) =>
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests; try again later'),
      ),
  });
}
export function createAuthRouter(service: AuthService) {
  const router = Router(),
    controller = createAuthController(service);
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/register', authLimit(10, 3600000), controller.register);
  router.post('/verify-email', authLimit(30, 900000), controller.verifyEmail);
  router.post(
    '/resend-verification',
    authLimit(20, 3600000),
    controller.resendVerification,
  );
  return router;
}
