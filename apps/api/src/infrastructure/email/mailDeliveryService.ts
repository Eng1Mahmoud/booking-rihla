import type { db as database } from '../../prisma/db.ts';

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Row<T> = NonNullable<Awaited<T>>;

const MAX_DELIVERY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 15 * 60_000;

function noticeMessage(tx: Transaction, id: string) {
  return tx.orm.public.BookingNotice.where({ id })
    .include('booking', (booking) =>
      booking.include('user').include('trip').include('refund'),
    )
    .first();
}

type Messages = {
  account: Row<ReturnType<typeof database.orm.public.EmailOutbox.first>>;
  ticket: Row<ReturnType<typeof database.orm.public.Ticket.first>>;
  reminder: Row<ReturnType<typeof database.orm.public.Ticket.first>>;
  notice: Row<ReturnType<typeof noticeMessage>>;
};
type Queue = keyof Messages;
type Delivery = 'discarded' | null | (() => Promise<void | 'discarded'>);
type DeliveryUpdate = {
  sentAt?: string;
  discardedAt?: string;
  attempts?: number;
  nextAttemptAt?: string;
};

async function lockMessage(
  tx: Transaction,
  db: typeof database,
  queue: Queue,
  id: string,
) {
  let query;
  switch (queue) {
    case 'account':
      query = db.raw
        .sql`SELECT "id" FROM "public"."EmailOutbox" WHERE "id" = ${id} FOR UPDATE`;
      break;
    case 'notice':
      query = db.raw
        .sql`SELECT "id" FROM "public"."BookingNotice" WHERE "id" = ${id} FOR UPDATE`;
      break;
    default:
      query = db.raw
        .sql`SELECT "id" FROM "public"."Ticket" WHERE "id" = ${id} FOR UPDATE`;
  }
  await tx.execute(query.affectedCount().build());
}

function deliveryState(message: Messages[Queue], queue: Queue) {
  if (queue !== 'reminder') return message;

  // Ticket delivery and its reminder have separate tracking columns.
  const reminder = message as Messages['reminder'];
  return {
    sentAt: reminder.reminderSentAt,
    discardedAt: reminder.reminderDiscardedAt,
    attempts: reminder.reminderAttempts,
    nextAttemptAt: reminder.reminderNextAttemptAt,
  };
}

function readMessage(tx: Transaction, queue: Queue, id: string) {
  if (queue === 'account')
    return tx.orm.public.EmailOutbox.where({ id }).first();
  if (queue === 'notice') return noticeMessage(tx, id);
  return tx.orm.public.Ticket.where({ id }).first();
}

function updateMessage(
  tx: Transaction,
  queue: Queue,
  id: string,
  update: DeliveryUpdate,
) {
  if (queue === 'reminder')
    return tx.orm.public.Ticket.where({ id }).update({
      ...(update.sentAt !== undefined ? { reminderSentAt: update.sentAt } : {}),
      ...(update.discardedAt !== undefined
        ? { reminderDiscardedAt: update.discardedAt }
        : {}),
      ...(update.attempts !== undefined
        ? { reminderAttempts: update.attempts }
        : {}),
      ...(update.nextAttemptAt !== undefined
        ? { reminderNextAttemptAt: update.nextAttemptAt }
        : {}),
    });
  if (queue === 'account')
    return tx.orm.public.EmailOutbox.where({ id }).update({
      ...update,
      ...(update.sentAt !== undefined || update.discardedAt !== undefined
        ? { encryptedCode: null }
        : {}),
    });
  if (queue === 'notice')
    return tx.orm.public.BookingNotice.where({ id }).update(update);
  return tx.orm.public.Ticket.where({ id }).update(update);
}

// Preparation keeps purpose-specific eligibility outside the delivery retry block.
// Its returned function runs inside that block, including account-code checks.
// Email delivery stays under the row lock: delivery remains at least once after a crash.
export async function processMailBatch<K extends Queue>(
  db: typeof database,
  candidates: readonly { id: string }[],
  queue: K,
  prepare: (context: {
    tx: Transaction;
    message: Messages[K];
    exhausted: boolean;
    current: number | undefined;
  }) => Promise<Delivery>,
  clock: () => number = Date.now,
) {
  const counts = { sent: 0, failed: 0, discarded: 0 };
  for (const candidate of candidates) {
    const outcome = await db.transaction(async (tx) => {
      // 1. Lock and re-read: another worker may have processed the candidate.
      await lockMessage(tx, db, queue, candidate.id);
      const message = (await readMessage(tx, queue, candidate.id)) as
        Messages[K] | null;
      // Reminders use one clock snapshot for their due/eligibility/discard checks.
      const current = queue === 'reminder' ? clock() : undefined;
      if (!message) return null;
      const messageId = message.id;
      const state = deliveryState(message, queue);
      if (
        state.sentAt ||
        state.discardedAt ||
        Date.parse(state.nextAttemptAt) > (current ?? clock())
      )
        return null;
      async function discard() {
        await updateMessage(tx, queue, messageId, {
          discardedAt: new Date(current ?? clock()).toISOString(),
        });
        return 'discarded' as const;
      }

      // 2. The owning service decides whether to send, skip or discard.
      const delivery = await prepare({
        tx,
        message,
        exhausted: state.attempts >= MAX_DELIVERY_ATTEMPTS,
        current,
      });
      if (delivery === null) return null;
      if (delivery === 'discarded') return discard();

      // 3. Send under the lock, then record acceptance by the provider.
      try {
        if ((await delivery()) === 'discarded') return await discard();
        await updateMessage(tx, queue, message.id, {
          sentAt: new Date(clock()).toISOString(),
          attempts: state.attempts + 1,
        });
        return 'sent' as const;
      } catch {
        // 4. Retry failures with a growing delay; stop after five attempts.
        const attempts = state.attempts + 1;
        await updateMessage(tx, queue, message.id, {
          attempts,
          nextAttemptAt: new Date(
            clock() +
              Math.min(
                MAX_RETRY_DELAY_MS,
                INITIAL_RETRY_DELAY_MS * 2 ** (attempts - 1),
              ),
          ).toISOString(),
          ...(attempts >= MAX_DELIVERY_ATTEMPTS
            ? { discardedAt: new Date(clock()).toISOString() }
            : {}),
        });
        return 'failed' as const;
      }
    });
    if (outcome) counts[outcome]++;
  }
  return counts;
}
