import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to use Prisma');
}

if (
  !URL.canParse(url) ||
  !['postgres:', 'postgresql:'].includes(new URL(url).protocol)
)
  throw new Error('Invalid database configuration: DATABASE_URL');

export const db = postgres<Contract>({
  contractJson,
  url,
});
