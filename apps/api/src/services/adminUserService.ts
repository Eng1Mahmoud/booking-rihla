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
    const rows = await passengers(db)
      .where({
        ...(email === undefined ? {} : { email }),
        ...(phone === undefined ? {} : { phone }),
        ...(isActive === undefined ? {} : { isActive }),
      })
      .orderBy([(user) => user.createdAt.desc(), (user) => user.id.desc()])
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(serializeUser);
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
      await tx.execute(
        db.raw
          .sql`SELECT pg_advisory_xact_lock(hashtextextended(${candidate.email}, 0))`
          .affectedCount()
          .build(),
      );
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."User" WHERE "id" = ${id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      // Recheck the role under the row lock; never modify a promoted or deleted account.
      if (!(await passengers(tx).where({ id }).first())) return null;
      await tx.orm.public.User.where({ id }).update({
        isActive: input.isActive,
      });
      if (!input.isActive)
        await tx.orm.public.Session.where({
          userId: id,
          revokedAt: null,
        }).updateAll({ revokedAt: new Date().toISOString() });
      const user = await passengers(tx).where({ id }).first();
      if (!user) throw new Error('Updated passenger account is missing');
      return serializeUser(user);
    });
  },
};
export type AdminUserService = typeof adminUserService;
