import { processEmailOutbox } from './emailOutboxService.ts';
import { processBookingNotices } from './bookingNoticeService.ts';
import { processTicketOutbox } from './ticketOutboxService.ts';
import { processDepartureReminders } from './departureReminderService.ts';
import { expireBookingHolds } from './bookingHoldService.ts';
import { cleanupAuthData } from './authCleanupService.ts';
import { configuredPaymentReconciliation } from './paymentReconciliationService.ts';
import { configuredRefundService } from './refundService.ts';

export const scheduledJobService = {
  async email() {
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
    return result;
  },
  booking: () => expireBookingHolds(),
  authCleanup: () => cleanupAuthData(),
  async payment() {
    const service = configuredPaymentReconciliation();
    if (!service) return { enabled: false };
    return { enabled: true, ...(await service.runBatch()) };
  },
  async refund() {
    if (
      process.env.PAYMOB_REFUNDS_ENABLED !== 'true' ||
      process.env.PAYMOB_ENABLED !== 'true'
    )
      return { enabled: false };
    const service = configuredRefundService();
    const { db } = await import('../prisma/db.ts');
    const rows = await db.orm.public.Refund.where((row) =>
      row.status.in(['REQUESTED', 'UNKNOWN']),
    )
      .orderBy((row) => row.updatedAt.asc())
      .limit(20)
      .all();
    const counts = { checked: 0, failed: 0 };
    for (const row of rows) {
      try {
        await service.reconcile(row.id);
        counts.checked++;
      } catch {
        counts.failed++;
      }
    }
    return { enabled: true, ...counts };
  },
};
