import { AppError } from '../errors/AppError.ts';
import { parsePaymobEnv } from '../config/paymob.ts';
import { createPaymobProvider } from '../payments/paymobProvider.ts';
import type {
  PaymentProvider,
  PaymentTransaction,
} from '../payments/paymentProvider.ts';
import type { AuthContext } from './sessionService.ts';
import { requireFinancialActor } from './financialActor.ts';
import { recordAudit } from './auditWriter.ts';
import { serializeBookingPayment } from '../payments/paymentStatus.ts';
import type { db as database } from '../prisma/db.ts';
function records(client: Pick<typeof database, 'orm'>) {
  return client.orm.public.Refund.include('booking', (b) =>
    b
      .include('trip')
      .include('paymentAttempt', (p) =>
        p.include('paymentSession', (a) => a.include('settlement')),
      ),
  );
}
type Row = NonNullable<
  Awaited<ReturnType<ReturnType<typeof records>['first']>>
>;
export function serializeRefund(row: {
  id: string;
  bookingId: string;
  status: string;
  amountPiastres: bigint;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    status: row.status,
    amountPiastres: row.amountPiastres.toString(),
    currency: 'EGP',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function matches(
  row: Row,
  remote: PaymentTransaction,
  scope: { integrationId: number; ownerId: number },
) {
  const b = row.booking,
    a = b?.paymentAttempt?.paymentSession,
    s = a?.settlement;
  return (
    b &&
    ((b.trip?.status === 'CANCELLED' && b.status === 'CONFIRMED') ||
      b.status === 'EXPIRED') &&
    a &&
    s?.kind === 'SALE' &&
    s.status === 'SUCCEEDED' &&
    a.reconciliationComplete &&
    ['PAID', 'REFUND_REQUIRED', 'REFUNDED'].includes(
      serializeBookingPayment({ ...b, refund: row }).paymentStatus,
    ) &&
    row.amountPiastres === b.totalPiastres &&
    remote.orderId === a.orderId &&
    remote.integrationId === scope.integrationId &&
    remote.ownerId === scope.ownerId &&
    a.integrationId === String(scope.integrationId) &&
    a.ownerId === String(scope.ownerId) &&
    !remote.live &&
    remote.currency === 'EGP' &&
    BigInt(remote.amountPiastres) === row.amountPiastres &&
    !remote.capture &&
    !remote.authorization &&
    remote.standalone &&
    !remote.parentTransactionId &&
    remote.id === s.transactionId &&
    !remote.voided
  );
}
export function createRefundService(
  provider: Pick<PaymentProvider, 'getTransaction' | 'refund'>,
  scope: { integrationId: number; ownerId: number },
) {
  async function reconcile(
    id: string,
    allowReview = false,
    actor?: AuthContext,
  ) {
    const { db } = await import('../prisma/db.ts');
    const row = await records(db).where({ id }).first();
    if (
      !row ||
      !row.transactionId ||
      row.status === 'PENDING' ||
      row.status === 'SUCCEEDED' ||
      (row.status === 'REVIEW' && !allowReview)
    )
      return row ? serializeRefund(row) : null;
    let remote: PaymentTransaction;
    try {
      remote = await provider.getTransaction(row.transactionId);
    } catch {
      await db.orm.public.Refund.where({ id })
        .where((r) => r.status.in(['REQUESTED', 'UNKNOWN']))
        .updateAll({ updatedAt: new Date().toISOString() });
      return serializeRefund(row);
    }
    return db.transaction(async (tx) => {
      if (actor) await requireFinancialActor(tx, db, actor);
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Refund" WHERE "id" = ${id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const current = await records(tx).where({ id }).first();
      if (!current) return null;
      if (
        current.status === 'SUCCEEDED' ||
        (current.status === 'REVIEW' && !allowReview)
      )
        return serializeRefund(current);
      let status: 'UNKNOWN' | 'SUCCEEDED' | 'REVIEW' = 'UNKNOWN';
      if (
        !matches(current, remote, scope) ||
        remote.id !== current.transactionId
      )
        status = 'REVIEW';
      else if (
        !remote.pending &&
        remote.success &&
        remote.refunded &&
        remote.refundedPiastres === Number(current.amountPiastres)
      )
        status = 'SUCCEEDED';
      else if ((remote.refundedPiastres ?? 0) > 0 || remote.refunded)
        status = 'REVIEW';
      if (current.status === 'REVIEW' && status !== 'SUCCEEDED')
        status = 'REVIEW';
      const saved = await tx.orm.public.Refund.where({ id }).update({
        status,
        updatedAt: new Date().toISOString(),
      });
      if (status === 'SUCCEEDED')
        await tx.orm.public.BookingNotice.create({
          bookingId: current.bookingId,
          purpose: 'REFUND_SUCCEEDED',
        });
      await recordAudit(tx, actor, 'Refund', id, current, saved);
      return saved ? serializeRefund(saved) : null;
    });
  }
  return {
    reconcile,
    async review(auth: AuthContext, id: string) {
      const { db } = await import('../prisma/db.ts');
      await db.transaction((tx) => requireFinancialActor(tx, db, auth));
      // Re-read authenticated evidence; no resending or manual success override.
      return reconcile(id, true, auth);
    },
    async issue(auth: AuthContext, id: string) {
      const { db } = await import('../prisma/db.ts');
      // Authorization precedes provider I/O, including for direct service callers.
      await db.transaction((tx) => requireFinancialActor(tx, db, auth));
      const row = await records(db).where({ id }).first();
      if (!row) throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
      if (row.status !== 'PENDING') return reconcile(id);
      const transactionId =
        row.booking?.paymentAttempt?.paymentSession?.settlement?.transactionId;
      if (!transactionId)
        throw new AppError(
          409,
          'REFUND_REVIEW_REQUIRED',
          'Verified payment references are required',
        );
      let remote: PaymentTransaction;
      try {
        remote = await provider.getTransaction(transactionId);
      } catch {
        throw new AppError(
          503,
          'PAYMENT_UNAVAILABLE',
          'Payment is temporarily unavailable',
        );
      }
      if (
        !matches(row, remote, scope) ||
        remote.pending ||
        !remote.success ||
        remote.refunded ||
        remote.refundedPiastres !== 0
      ) {
        const latest = await db.orm.public.Refund.where({ id }).first();
        if (latest && latest.status !== 'PENDING') return reconcile(id);
        throw new AppError(
          409,
          'REFUND_REVIEW_REQUIRED',
          'A verified, successful and unrefunded transaction is required',
        );
      }
      const claimed = await db.transaction(async (tx) => {
        await requireFinancialActor(tx, db, auth);
        await tx.execute(
          db.raw
            .sql`SELECT "id" FROM "public"."Refund" WHERE "id" = ${id} FOR UPDATE`
            .affectedCount()
            .build(),
        );
        const current = await records(tx).where({ id }).first();
        if (!current || current.status !== 'PENDING') return false;
        if (!matches(current, remote, scope))
          throw new AppError(
            409,
            'REFUND_REVIEW_REQUIRED',
            'Payment data changed',
          );
        const saved = await tx.orm.public.Refund.where({ id }).update({
          status: 'REQUESTED',
          transactionId: remote.id,
          requestedBy: auth.user.id,
          updatedAt: new Date().toISOString(),
        });
        await recordAudit(tx, auth, 'Refund', id, current, saved);
        return true;
      });
      if (claimed) {
        // Durable claim is committed before I/O. A timeout or crash never triggers a second refund POST.
        try {
          await provider.refund(remote.id, Number(row.amountPiastres));
        } catch {
          /* Inquiry resolves the outcome. */
        }
      }
      return reconcile(id);
    },
  };
}
export function configuredRefundService() {
  if (process.env['PAYMOB_REFUNDS_ENABLED'] !== 'true')
    throw new AppError(
      503,
      'PAYMENT_UNAVAILABLE',
      'Payment is temporarily unavailable',
    );
  const config = parsePaymobEnv(process.env);
  if (!config)
    throw new AppError(
      503,
      'PAYMENT_UNAVAILABLE',
      'Payment is temporarily unavailable',
    );
  return createRefundService(createPaymobProvider(config), {
    integrationId: config.PAYMOB_INTEGRATION_ID,
    ownerId: config.PAYMOB_OWNER_ID,
  });
}
export const refundReadService = {
  async list(limit: number, offset: number) {
    const { db } = await import('../prisma/db.ts');
    return (
      await db.orm.public.Refund.orderBy([
        (r) => r.createdAt.desc(),
        (r) => r.id.desc(),
      ])
        .limit(limit)
        .offset(offset)
        .all()
    ).map(serializeRefund);
  },
  async get(id: string, userId?: string) {
    const { db } = await import('../prisma/db.ts');
    const row = await records(db).where({ id }).first();
    return row && (!userId || row.booking?.userId === userId)
      ? serializeRefund(row)
      : null;
  },
};
