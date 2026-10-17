#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/da8b04465317f9615abadd3995ecec96a083823ffa6f819181212a28df3e031c/contract';
import startContract from '../../snapshots/da8b04465317f9615abadd3995ecec96a083823ffa6f819181212a28df3e031c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fb461ba352a14da7f3886e2847c2f326b784549ab529fad87cbc59ea8559cb61/contract';
import endContract from '../../snapshots/fb461ba352a14da7f3886e2847c2f326b784549ab529fad87cbc59ea8559cb61/contract.json' with { type: 'json' };
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
        table: 'PaymentAttempt',
        columns: [
          col('amountPiastres', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
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
          col('currency', 'text', {
            notNull: true,
            default: lit('EGP'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('idempotencyKey', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'payment_attempt_amount_751e37b6',
            sql`"amountPiastres" BETWEEN 1 AND 214748364700 AND currency = 'EGP'`,
          ),
          checkExpression(
            'payment_attempt_expiry_ba6ba4ee',
            sql`"expiresAt" > "createdAt"`,
          ),
          checkExpression(
            'payment_attempt_key_04039cd6',
            sql`"idempotencyKey" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentAttempt',
        constraint: 'PaymentAttempt_bookingId_key',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAttempt',
        index: 'PaymentAttempt_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentAttempt',
        foreignKey: {
          name: 'PaymentAttempt_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
