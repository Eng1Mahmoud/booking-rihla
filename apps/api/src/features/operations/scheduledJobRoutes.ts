import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { scheduledJobController } from './scheduledJobController.ts';
import { sendFailure } from '../../utils/apiResponse.ts';

export const scheduledJobRouter = Router();
scheduledJobRouter.use((request, response, next) => {
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
scheduledJobRouter.post('/email', scheduledJobController.email);
scheduledJobRouter.post('/booking', scheduledJobController.booking);
scheduledJobRouter.post('/payment', scheduledJobController.payment);
scheduledJobRouter.post('/refund', scheduledJobController.refund);
scheduledJobRouter.post('/auth-cleanup', scheduledJobController.authCleanup);
