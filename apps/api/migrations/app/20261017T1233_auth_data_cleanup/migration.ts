#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/719446d15f3c134a2cdd5002ecdd9fb327e23ea01ab505ffb7b892d54f14b822/contract';
import startContract from '../../snapshots/719446d15f3c134a2cdd5002ecdd9fb327e23ea01ab505ffb7b892d54f14b822/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8835ce0934b203103026e92c12bff6a44b7c38bc33dc452eb35ffd55bf77ba6e/contract';
import endContract from '../../snapshots/8835ce0934b203103026e92c12bff6a44b7c38bc33dc452eb35ffd55bf77ba6e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropNotNull({
        schema: 'public',
        table: 'EmailVerification',
        column: 'codeHash',
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailOutbox',
        index: 'account_email_expiry_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailVerification',
        index: 'verification_code_expiry_8025eaca',
        columns: ['expiresAt'],
        extras: { where: sql`"codeHash" IS NOT NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordReset',
        index: 'reset_code_expiry_8025eaca',
        columns: ['expiresAt'],
        extras: { where: sql`"codeHash" IS NOT NULL` },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'session_expiry_6b6b8c10',
        columns: ['expiresAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
