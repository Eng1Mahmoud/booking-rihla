import { lockAccountEmail, revokeAccountSessions } from './accountSecurity.ts';
import { lockAdministrators } from './administratorLocks.ts';
import { AppError } from '../errors/AppError.ts';
import { registerSchema } from '../schemas/authSchema.ts';

// Local operator command only; never expose this operation through public registration.
export async function bootstrapSuperAdmin(input: string) {
  const email = registerSchema.shape.email.parse(input);
  const { db } = await import('../prisma/db.ts');
  return await db.transaction(async (tx) => {
    await lockAdministrators(tx, db);
    await lockAccountEmail(tx, db, email);
    const existing = await tx.orm.public.User.where({
      role: 'SUPER_ADMIN',
    }).first();
    const user = await tx.orm.public.User.where({ email }).first();
    if (existing && existing.id !== user?.id)
      throw new AppError(
        409,
        'BOOTSTRAP_COMPLETED',
        'A super admin already exists; use administrator management',
      );
    if (!user || !user.emailVerifiedAt || !user.isActive)
      throw new AppError(
        400,
        'BOOTSTRAP_ACCOUNT_REQUIRED',
        'Register and verify an active account before bootstrapping it',
      );
    if (existing)
      return { id: user.id, role: 'SUPER_ADMIN' as const, changed: false };
    await tx.orm.public.User.where({ id: user.id }).update({
      role: 'SUPER_ADMIN',
    });
    await revokeAccountSessions(tx, user.id);
    return { id: user.id, role: 'SUPER_ADMIN' as const, changed: true };
  });
}
