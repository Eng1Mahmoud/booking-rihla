import { setTimeout } from 'node:timers/promises';
import { cleanupAuthData } from '../services/authCleanupService.ts';
const once = process.argv.includes('--once');
const stop = new AbortController();
process.once('SIGINT', () => stop.abort());
process.once('SIGTERM', () => stop.abort());
let close: (() => Promise<void>) | undefined;
try {
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  do {
    try {
      const counts = await cleanupAuthData();
      if (once || Object.values(counts).some((count) => count > 0))
        console.log(JSON.stringify(counts));
    } catch {
      console.error(
        'Authentication data cleanup failed; check database configuration',
      );
      if (once) process.exitCode = 1;
    }
    if (once || stop.signal.aborted) break;
    try {
      await setTimeout(60 * 60 * 1000, undefined, { signal: stop.signal });
    } catch {
      if (!stop.signal.aborted) throw new Error('Cleanup timer failed');
    }
  } while (!stop.signal.aborted);
} catch {
  console.error('Authentication cleanup worker could not start');
  process.exitCode = 1;
} finally {
  await close?.();
}
