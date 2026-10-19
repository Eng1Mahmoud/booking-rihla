import 'dotenv/config';
import { seedEgyptCatalog } from './seedEgyptCatalog.ts';

let close: (() => Promise<void>) | undefined;
try {
  const reset = process.argv.includes('--reset-local-data');
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  console.log(
    JSON.stringify({
      message: reset
        ? 'All previous local application data removed; Egyptian development catalog created'
        : 'Egyptian development catalog ready',
      ...(await seedEgyptCatalog(reset)),
    }),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Catalog seed failed');
  process.exitCode = 1;
} finally {
  await close?.();
}
