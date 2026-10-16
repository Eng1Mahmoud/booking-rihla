import 'dotenv/config';
import { bootstrapSuperAdmin } from '../services/adminBootstrapService.ts';
import { AppError } from '../errors/AppError.ts';

let close: (() => Promise<void>) | undefined;
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--email' || !args[1])
    throw new Error(
      'Usage: npm run admin:bootstrap -- --email verified@example.com',
    );
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const result = await bootstrapSuperAdmin(args[1]);
  console.log(
    JSON.stringify({
      message: result.changed
        ? 'First super admin ready; sign in again'
        : 'This account is already the first super admin',
      ...result,
    }),
  );
} catch (error) {
  console.error(
    error instanceof AppError
      ? error.message
      : 'Bootstrap failed. Use --email with an active, verified account and apply migrations first.',
  );
  process.exitCode = 1;
} finally {
  await close?.();
}
