import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { processEmailOutbox } from '../services/emailOutboxService.ts';
import { processBookingNotices } from '../services/bookingNoticeService.ts';
import { processTicketOutbox } from '../services/ticketOutboxService.ts';
import { processDepartureReminders } from '../services/departureReminderService.ts';
import { sendFailure, sendSuccess } from '../utils/apiResponse.ts';

export function createEmailJobRouter() {
  const router = Router();
  router.post('/email', async (request, response) => {
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
    const queues = [
      {
        name: 'account',
        run: () => processEmailOutbox(),
      },
      {
        name: 'booking-notices',
        run: () => processBookingNotices(),
      },
      {
        name: 'tickets',
        run: () => processTicketOutbox(),
      },
      {
        name: 'departure-reminders',
        run: () => processDepartureReminders(),
      },
    ];
    const result = { sent: 0, failed: 0, discarded: 0, errors: 0 };
    for (const queue of queues) {
      try {
        const counts = await queue.run();
        result.sent += counts.sent;
        result.failed += counts.failed;
        result.discarded += counts.discarded;
      } catch {
        result.errors++;
        console.error(
          JSON.stringify({
            event: 'email_job_queue_failed',
            queue: queue.name,
          }),
        );
      }
    }
    console.log(JSON.stringify({ event: 'email_job_completed', ...result }));
    if (result.errors || result.failed) {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
      return;
    }
    sendSuccess(response, result);
  });
  return router;
}
