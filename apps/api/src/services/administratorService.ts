import { lockAccountEmail, revokeAccountSessions } from './accountSecurity.ts';
import { recordAudit } from './auditWriter.ts';
import { AppError } from '../errors/AppError.ts';
import type { db as database } from '../prisma/db.ts';
import type { AuthContext } from './sessionService.ts';
import type {
  AdministratorListQuery,
  UpdateAdministratorRoleInput,
  UpdateAdministratorStatusInput,
} from '../schemas/administratorSchema.ts';
import { userRecords, serializeUser } from './adminUserService.ts';
import { lockAdministrators } from './administratorLocks.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
function staff(client: Pick<typeof database, 'orm'>) {
  return userRecords(client).where((user) => user.role.neq('USER'));
}
async function requireCurrentSuperAdmin(tx: Transaction, auth: AuthContext) {
  const session = await tx.orm.public.Session.where({
    id: auth.sessionId,
    userId: auth.user.id,
  })
    .select('id', 'revokedAt', 'expiresAt')
    .include('user', (user) =>
      user.select('role', 'isActive', 'emailVerifiedAt'),
    )
    .first();
  if (
    !session ||
    !session.user ||
    session.revokedAt ||
    Date.parse(session.expiresAt) <= Date.now() ||
    !session.user.isActive ||
    !session.user.emailVerifiedAt
  )
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  if (session.user.role !== 'SUPER_ADMIN')
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only a super admin may manage administrators',
    );
}
async function changeAdministrator(
  auth: AuthContext,
  id: string,
  input: UpdateAdministratorRoleInput | UpdateAdministratorStatusInput,
) {
  const { db } = await import('../prisma/db.ts');
  return await db.transaction(async (tx) => {
    await lockAdministrators(tx, db);
    await requireCurrentSuperAdmin(tx, auth);
    const candidate = await userRecords(tx).where({ id }).first();
    if (!candidate) return null;
    await lockAccountEmail(tx, db, candidate.email);
    await tx.execute(
      db.raw.sql`SELECT "id" FROM "public"."User" WHERE "id" = ${id} FOR UPDATE`
        .affectedCount()
        .build(),
    );
    await requireCurrentSuperAdmin(tx, auth);
    const target = await userRecords(tx).where({ id }).first();
    if (!target || ('isActive' in input && target.role === 'USER')) return null;
    const role = 'role' in input ? input.role : target.role;
    const isActive = 'isActive' in input ? input.isActive : target.isActive;
    const changedRole = role !== target.role;
    if (
      changedRole &&
      role !== 'USER' &&
      (!target.isActive || !target.emailVerifiedAt)
    )
      throw new AppError(
        409,
        'ACCOUNT_NOT_READY',
        'An account must be active and email-verified before receiving an administrator role',
      );
    if (
      target.role === 'SUPER_ADMIN' &&
      (role !== 'SUPER_ADMIN' || !isActive)
    ) {
      const remaining = await staff(tx)
        .where({ role: 'SUPER_ADMIN', isActive: true })
        .all();
      if (!remaining.some((user) => user.id !== id && user.emailVerifiedAt))
        throw new AppError(
          409,
          'LAST_SUPER_ADMIN',
          'Keep at least one active email-verified super admin',
        );
    }
    await tx.orm.public.User.where({ id }).update(input);
    if (changedRole || !isActive) await revokeAccountSessions(tx, id);
    const updated = await userRecords(tx).where({ id }).first();
    if (!updated) throw new Error('Updated administrator account is missing');
    await recordAudit(tx, auth, 'User', id, target, updated);
    return serializeUser(updated);
  });
}
export const administratorService = {
  async list({ limit, offset, email, role, isActive }: AdministratorListQuery) {
    const { db } = await import('../prisma/db.ts');
    const users = await staff(db)
      .where({
        ...(email === undefined ? {} : { email }),
        ...(role === undefined ? {} : { role }),
        ...(isActive === undefined ? {} : { isActive }),
      })
      .orderBy([(user) => user.createdAt.desc(), (user) => user.id.desc()])
      .limit(limit)
      .offset(offset)
      .all();
    return users.map(serializeUser);
  },
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const user = await staff(db).where({ id }).first();
    return user ? serializeUser(user) : null;
  },
  async updateRole(
    auth: AuthContext,
    id: string,
    input: UpdateAdministratorRoleInput,
  ) {
    return await changeAdministrator(auth, id, input);
  },
  async updateStatus(
    auth: AuthContext,
    id: string,
    input: UpdateAdministratorStatusInput,
  ) {
    return await changeAdministrator(auth, id, input);
  },
};
export type AdministratorService = typeof administratorService;
