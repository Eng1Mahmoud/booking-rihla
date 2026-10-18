#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8835ce0934b203103026e92c12bff6a44b7c38bc33dc452eb35ffd55bf77ba6e/contract';
import startContract from '../../snapshots/8835ce0934b203103026e92c12bff6a44b7c38bc33dc452eb35ffd55bf77ba6e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e9343db78436ad4bd7a9e4f1495e0c342692dffacf19eafb0faedf97cc93cef5/contract';
import endContract from '../../snapshots/e9343db78436ad4bd7a9e4f1495e0c342692dffacf19eafb0faedf97cc93cef5/contract.json' with { type: 'json' };
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
        table: 'BookingNotice',
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
          col('purpose', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sentAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BookingNotice_purpose_check_698cbb9f',
            sql`"purpose" IN ('TRIP_CANCELLED', 'REFUND_SUCCEEDED')`,
          ),
          checkExpression(
            'booking_notice_attempts_4c896e7d',
            sql`attempts BETWEEN 0 AND 5`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Refund',
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
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('requestedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Refund_status_check_d12710e0',
            sql`"status" IN ('PENDING', 'REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'REVIEW')`,
          ),
          checkExpression(
            'refund_amount_8155a401',
            sql`"amountPiastres" BETWEEN 1 AND 214748364700`,
          ),
          checkExpression(
            'refund_transaction_8d4c9e2d',
            sql`"transactionId" IS NULL OR "transactionId" ~ '^[1-9][0-9]{0,15}$'`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Trip',
        column: col('cancellationReason', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Trip',
        column: col('cancelledAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'BookingNotice',
        constraint: 'BookingNotice_bookingId_purpose_key',
        columns: ['bookingId', 'purpose'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Refund',
        constraint: 'Refund_bookingId_key',
        columns: ['bookingId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Refund',
        constraint: 'Refund_transactionId_key',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingNotice',
        index: 'BookingNotice_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingNotice',
        index: 'BookingNotice_sentAt_discardedAt_nextAttemptAt_idx_1189e9ab',
        columns: ['sentAt', 'discardedAt', 'nextAttemptAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Refund',
        index: 'Refund_status_updatedAt_idx_29f913bb',
        columns: ['status', 'updatedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingNotice',
        foreignKey: {
          name: 'BookingNotice_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Refund',
        foreignKey: {
          name: 'Refund_bookingId_fkey',
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
