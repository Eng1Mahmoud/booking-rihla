#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2abbdd8d62750563f4be41ca247c30a14b3e79f081ddd45fe30df246fcc975c0/contract';
import endContract from '../../snapshots/2abbdd8d62750563f4be41ca247c30a14b3e79f081ddd45fe30df246fcc975c0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fbcc5d303193ba19f660a1af9fc04176b313772e5f97b1d607309474009884a0/contract';
import startContract from '../../snapshots/fbcc5d303193ba19f660a1af9fc04176b313772e5f97b1d607309474009884a0/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Ticket',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('bookingId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('discardedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('nextAttemptAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('sentAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ticket_mail_attempts_4c896e7d',
            sql`attempts BETWEEN 0 AND 5`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Ticket',
        constraint: 'Ticket_bookingId_key',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Ticket',
        index: 'ticket_mail_due_1189e9ab',
        columns: ['sentAt', 'discardedAt', 'nextAttemptAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Ticket',
        foreignKey: {
          name: 'Ticket_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
