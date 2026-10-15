import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { parseEnv } from '../config/env.ts';

const env = parseEnv(process.env);
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to use Prisma');
}

export const db = postgres<Contract>({
  contractJson,
  url: env.DATABASE_URL,
});
