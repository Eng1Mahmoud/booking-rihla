import type { db as database } from '../prisma/db.ts';

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Row<T> = NonNullable<Awaited<T>>;

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
  const query =
    queue === 'account'
      ? db.raw
          .sql`SELECT "id" FROM "public"."EmailOutbox" WHERE "id" = ${id} FOR UPDATE`
      : queue === 'notice'
        ? db.raw
            .sql`SELECT "id" FROM "public"."BookingNotice" WHERE "id" = ${id} FOR UPDATE`
        : db.raw
            .sql`SELECT "id" FROM "public"."Ticket" WHERE "id" = ${id} FOR UPDATE`;
  await tx.execute(query.affectedCount().build());
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
      await lockMessage(tx, db, queue, candidate.id);
      const message = (await readMessage(tx, queue, candidate.id)) as
        Messages[K] | null;
      // Reminders use one clock snapshot for their due/eligibility/discard checks.
      const current = queue === 'reminder' ? clock() : undefined;
      if (!message) return null;
      const reminder = message as Messages['reminder'];
      const state =
        queue === 'reminder'
          ? {
              sentAt: reminder.reminderSentAt,
              discardedAt: reminder.reminderDiscardedAt,
              attempts: reminder.reminderAttempts,
              nextAttemptAt: reminder.reminderNextAttemptAt,
            }
          : message;
      if (
        state.sentAt ||
        state.discardedAt ||
        Date.parse(state.nextAttemptAt) > (current ?? clock())
      )
        return null;
      async function discard() {
        await updateMessage(tx, queue, message!.id, {
          discardedAt: new Date(current ?? clock()).toISOString(),
        });
        return 'discarded' as const;
      }
      const delivery = await prepare({
        tx,
        message,
        exhausted: state.attempts >= 5,
        current,
      });
      if (delivery === null) return null;
      if (delivery === 'discarded') return discard();
      try {
        if ((await delivery()) === 'discarded') return await discard();
        await updateMessage(tx, queue, message.id, {
          sentAt: new Date(clock()).toISOString(),
          attempts: state.attempts + 1,
        });
        return 'sent' as const;
      } catch {
        const attempts = state.attempts + 1;
        await updateMessage(tx, queue, message.id, {
          attempts,
          nextAttemptAt: new Date(
            clock() + Math.min(900000, 30000 * 2 ** (attempts - 1)),
          ).toISOString(),
          ...(attempts >= 5
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
