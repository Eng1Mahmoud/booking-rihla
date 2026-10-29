import { lockAccountEmail, revokeAccountSessions } from './accountSecurity.ts';
import type { db as database } from '../prisma/db.ts';
import type {
  AdminUserListQuery,
  UpdateUserStatusInput,
} from '../schemas/adminUserSchema.ts';

type Client = Pick<typeof database, 'orm'>;
export function userRecords(client: Client) {
  return client.orm.public.User.select(
    'id',
    'name',
    'email',
    'phone',
    'role',
    'language',
    'isActive',
    'emailVerifiedAt',
    'createdAt',
  );
}
function passengers(client: Client) {
  return userRecords(client).where({ role: 'USER' });
}

type UserRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof userRecords>['first']>>
>;
export function serializeUser(user: UserRecord) {
  return {
    ...user,
    createdAt: new Date(user.createdAt).toISOString(),
    emailVerifiedAt: user.emailVerifiedAt
      ? new Date(user.emailVerifiedAt).toISOString()
      : null,
  };
}
export const adminUserService = {
  async list({ limit, offset, email, phone, isActive }: AdminUserListQuery) {
    const { db } = await import('../prisma/db.ts');
    const query = passengers(db).where({
      ...(email === undefined ? {} : { email }),
      ...(phone === undefined ? {} : { phone }),
      ...(isActive === undefined ? {} : { isActive }),
    });
    const [rows, { total }] = await Promise.all([
      query
        .orderBy([(user) => user.createdAt.desc(), (user) => user.id.desc()])
        .limit(limit)
        .offset(offset)
        .all(),
      query.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);
    return { items: rows.map(serializeUser), total };
  },
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const user = await passengers(db).where({ id }).first();
    return user ? serializeUser(user) : null;
  },
  async updateStatus(id: string, input: UpdateUserStatusInput) {
    const { db } = await import('../prisma/db.ts');
    const candidate = await passengers(db).where({ id }).first();
    if (!candidate) return null;
    return await db.transaction(async (tx) => {
      // Match login/reset/logout-all: email advisory lock -> User -> Session.
      await lockAccountEmail(tx, db, candidate.email);
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      // Recheck the role under the row lock; never modify a promoted or deleted account.
      const before = await passengers(tx).where({ id }).first();
      if (!before) return null;
      await tx.orm.public.User.where({ id }).update({
        isActive: input.isActive,
      });
      if (!input.isActive) await revokeAccountSessions(tx, id);
      const user = await passengers(tx).where({ id }).first();
      if (!user) throw new Error('Updated passenger account is missing');
      return serializeUser(user);
    });
  },
};
export type AdminUserService = typeof adminUserService;
