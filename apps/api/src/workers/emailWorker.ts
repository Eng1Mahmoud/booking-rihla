import { processBookingNotices } from '../services/bookingNoticeService.ts';
import { processDepartureReminders } from '../services/departureReminderService.ts';
import { processTicketOutbox } from '../services/ticketOutboxService.ts';
import 'dotenv/config';
import { setTimeout } from 'node:timers/promises';
import { parseAuthEnv } from '../config/env.ts';
import { processEmailOutbox } from '../services/emailOutboxService.ts';
let stopping = false;
const stop = new AbortController();
process.once('SIGINT', () => {
  stopping = true;
  stop.abort();
});
process.once('SIGTERM', () => {
  stopping = true;
  stop.abort();
});
let close: (() => Promise<void>) | undefined;
try {
  parseAuthEnv(process.env);
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const once = process.argv.includes('--once');
  console.log(
    once ? 'Processing one email outbox batch' : 'Email worker running',
  );
  do {
    try {
      const notices = await processBookingNotices();
      const account = await processEmailOutbox();
      const tickets = await processTicketOutbox();
      const reminders = await processDepartureReminders();
      const result = {
        sent: account.sent + tickets.sent + reminders.sent + notices.sent,
        failed:
          account.failed + tickets.failed + reminders.failed + notices.failed,
        discarded:
          account.discarded +
          tickets.discarded +
          reminders.discarded +
          notices.discarded,
      };
      if (result.sent || result.failed || result.discarded)
        console.log(JSON.stringify(result));
    } catch {
      console.error(
        'Email outbox batch failed; check local database and mail configuration',
      );
      if (once) process.exitCode = 1;
    }
    if (once || stopping) break;
    await setTimeout(2000, undefined, { signal: stop.signal }).catch(() => {});
  } while (!stopping);
} catch {
  console.error('Email worker could not start; check configuration');
  process.exitCode = 1;
} finally {
  await close?.();
}
