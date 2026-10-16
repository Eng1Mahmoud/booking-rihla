import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { createSessionController } from '../controllers/sessionController.ts';
import type { SessionService } from '../services/sessionService.ts';
import { requireAuth } from '../middlewares/requireAuth.ts';
import { sessionCsrf } from '../middlewares/sessionCsrf.ts';
import { AppError } from '../errors/AppError.ts';
export function createSessionRouter(
  service: SessionService,
  allowedOrigins: string[],
) {
  const router = Router(),
    controller = createSessionController(service);
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
  router.use(cookieParser());
  router.post(
    '/login',
    limit(20),
    sessionCsrf(allowedOrigins),
    controller.login,
  );
  router.post(
    '/refresh',
    limit(60),
    sessionCsrf(allowedOrigins),
    controller.refresh,
  );
  router.get('/me', requireAuth(service), controller.me);
  router.post(
    '/logout',
    limit(60),
    sessionCsrf(allowedOrigins),
    controller.logout,
  );
  router.post(
    '/logout-all',
    limit(20),
    sessionCsrf(allowedOrigins),
    requireAuth(service),
    controller.logoutAll,
  );
  return router;
}
