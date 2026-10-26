import type { RequestHandler } from 'express';
import { scheduledJobService } from '../services/scheduledJobService.ts';
import { sendFailure, sendSuccess } from '../utils/apiResponse.ts';

type Job = keyof typeof scheduledJobService;

// All job results contain counters/configuration state only, never customer data.
function runJob(job: Job): RequestHandler {
  return async (_request, response) => {
    try {
      const result = await scheduledJobService[job]();
      console.log(
        JSON.stringify({ event: 'scheduled_job_completed', job, ...result }),
      );
      if (
        ('failed' in result && result.failed) ||
        ('errors' in result && result.errors)
      ) {
        sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
        return;
      }
      sendSuccess(response, result);
    } catch {
      console.error(JSON.stringify({ event: 'scheduled_job_failed', job }));
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
    }
  };
}

export const scheduledJobController = {
  email: runJob('email'),
  booking: runJob('booking'),
  payment: runJob('payment'),
  refund: runJob('refund'),
  authCleanup: runJob('authCleanup'),
};
