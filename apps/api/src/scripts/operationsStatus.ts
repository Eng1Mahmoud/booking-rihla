export {};
// Local/container operations command. Aggregate counts only; never provider I/O.
let close: (() => Promise<void>) | undefined;
try {
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const rows = await db.runtime().query(
    db.raw.sql`
    SELECT json_build_object(
      'overdueAccountEmails', (SELECT count(*) FROM "public"."EmailOutbox" WHERE "sentAt" IS NULL AND "discardedAt" IS NULL AND "expiresAt" > now() AND "nextAttemptAt" < now() - interval '10 minutes'),
      'overdueTicketEmails', (SELECT count(*) FROM "public"."Ticket" WHERE "sentAt" IS NULL AND "discardedAt" IS NULL AND "nextAttemptAt" < now() - interval '10 minutes'),
      'overdueBookingNotices', (SELECT count(*) FROM "public"."BookingNotice" WHERE "sentAt" IS NULL AND "discardedAt" IS NULL AND "nextAttemptAt" < now() - interval '10 minutes'),
      'overduePaymentInquiries', (SELECT count(*) FROM "public"."PaymentSession" WHERE NOT "reconciliationComplete" AND "createdAt" < now() - interval '15 minutes'),
      'paymentReview', (SELECT count(*) FROM "public"."PaymentSettlement" WHERE status = 'REVIEW'),
      'uncertainRefunds', (SELECT count(*) FROM "public"."Refund" WHERE status IN ('REQUESTED', 'UNKNOWN') AND "createdAt" < now() - interval '5 minutes'),
      'refundReview', (SELECT count(*) FROM "public"."Refund" WHERE status = 'REVIEW'),
      'refundsAwaitingIssue', (SELECT count(*) FROM "public"."Refund" WHERE status = 'PENDING')
    )::text AS report
  `
      .returnsRow({ report: 'pg/text@1' })
      .build(),
  );
  if (!rows[0]) throw new Error('Operational snapshot missing');
  const counts = JSON.parse(rows[0].report) as Record<string, unknown>;
  if (
    Object.values(counts).some(
      (value) =>
        typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0,
    )
  )
    throw new Error('Invalid operational counts');
  const attention = Object.values(counts).some(
    (value) => (value as number) > 0,
  );
  console.log(
    JSON.stringify({
      status: attention ? 'attention' : 'ok',
      serverTime: new Date().toISOString(),
      counts,
    }),
  );
  if (attention) process.exitCode = 1;
} catch {
  console.error(
    JSON.stringify({
      status: 'unavailable',
      message: 'Operational database check failed',
    }),
  );
  process.exitCode = 2;
} finally {
  await close?.();
}
