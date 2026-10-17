#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2abbdd8d62750563f4be41ca247c30a14b3e79f081ddd45fe30df246fcc975c0/contract';
import startContract from '../../snapshots/2abbdd8d62750563f4be41ca247c30a14b3e79f081ddd45fe30df246fcc975c0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/719446d15f3c134a2cdd5002ecdd9fb327e23ea01ab505ffb7b892d54f14b822/contract';
import endContract from '../../snapshots/719446d15f3c134a2cdd5002ecdd9fb327e23ea01ab505ffb7b892d54f14b822/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Ticket',
        column: col('reminderAttempts', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Ticket',
        column: col('reminderDiscardedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Ticket',
        column: col('reminderNextAttemptAt', 'timestamptz', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Ticket',
        column: col('reminderSentAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Ticket',
        constraint: 'ticket_reminder_attempts_b04f2be5',
        expression: sql`"reminderAttempts" BETWEEN 0 AND 5`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'Ticket',
        index: 'ticket_reminder_due_b7d94b53',
        columns: [
          'reminderSentAt',
          'reminderDiscardedAt',
          'reminderNextAttemptAt',
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
