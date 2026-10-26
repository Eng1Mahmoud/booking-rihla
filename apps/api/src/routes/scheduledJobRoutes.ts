import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { scheduledJobController } from '../controllers/scheduledJobController.ts';
import { sendFailure } from '../utils/apiResponse.ts';

export function createScheduledJobRouter() {
  const router = Router();
  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
      return;
    }
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(request.get('Authorization') ?? '');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      sendFailure(response, 401, 'UNAUTHORIZED');
      return;
    }
    next();
  });
  router.post('/email', scheduledJobController.email);
  router.post('/booking', scheduledJobController.booking);
  router.post('/payment', scheduledJobController.payment);
  router.post('/refund', scheduledJobController.refund);
  router.post('/auth-cleanup', scheduledJobController.authCleanup);
  return router;
}
