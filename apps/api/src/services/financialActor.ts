import type { db as database } from '../prisma/db.ts';
import type { AuthContext } from './sessionService.ts';
import { AppError } from '../errors/AppError.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
export async function requireFinancialActor(
  tx: Transaction,
  db: typeof database,
  auth: AuthContext,
) {
  await tx.execute(
    db.raw
      .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${auth.user.id} FOR SHARE`
      .affectedCount()
      .build(),
  );
  await tx.execute(
    db.raw
      .sql`SELECT "id" FROM "public"."Session" WHERE "id" = ${auth.sessionId} FOR SHARE`
      .affectedCount()
      .build(),
  );
  const session = await tx.orm.public.Session.where({
    id: auth.sessionId,
    userId: auth.user.id,
  })
    .include('user')
    .first();
  if (
    !session ||
    session.revokedAt ||
    Date.parse(session.expiresAt) <= Date.now() ||
    !session.user?.isActive ||
    !session.user.emailVerifiedAt
  )
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  if (session.user.role !== 'SUPER_ADMIN')
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only a super admin may cancel trips or issue refunds',
    );
}
