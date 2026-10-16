import 'dotenv/config';
import { setTimeout } from 'node:timers/promises';
import { parseAuthEnv } from '../config/env.ts';
import { processEmailOutbox } from '../services/emailOutboxService.ts';
let stopping = false;
process.once('SIGINT', () => {
  stopping = true;
});
process.once('SIGTERM', () => {
  stopping = true;
});
let close: (() => Promise<void>) | undefined;
try {
  parseAuthEnv(process.env);
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const once = process.argv.includes('--once');
  console.log(
    once ? 'Processing one email outbox batch' : 'Email worker running',
  );
  do {
    try {
      const result = await processEmailOutbox();
      if (result.sent || result.failed || result.discarded)
        console.log(JSON.stringify(result));
    } catch {
      console.error(
        'Email outbox batch failed; check local database and mail configuration',
      );
      if (once) process.exitCode = 1;
    }
    if (once || stopping) break;
    await setTimeout(2000);
  } while (!stopping);
} catch {
  console.error('Email worker could not start; check configuration');
  process.exitCode = 1;
} finally {
  await close?.();
}
