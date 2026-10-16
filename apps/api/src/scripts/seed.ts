import 'dotenv/config';
import { parseEnv } from '../config/env.ts';
import { seedDemo } from './demoSeed.ts';

let close: (() => Promise<void>) | undefined;
try {
  if (parseEnv(process.env).NODE_ENV === 'production')
    throw new Error('Demo seed is disabled in production');
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const data = await seedDemo();
  console.log(
    JSON.stringify(
      {
        message: 'Demo data ready (existing matching rows preserved)',
        dates: data.dates,
        timeZone: 'Africa/Cairo',
        cities: data.cities,
        stations: data.stations,
        trips: data.trips.length,
      },
      null,
      2,
    ),
  );
} catch {
  console.error(
    'Demo seed failed. Use a development database with applied migrations and unchanged demo records; existing data was not overwritten.',
  );
  process.exitCode = 1;
} finally {
  await close?.();
}
