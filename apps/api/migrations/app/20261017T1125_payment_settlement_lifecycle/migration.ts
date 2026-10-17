#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1f485d4ef82f51f46ce5d63f43fa0fb8287111853c6256d46b31b10fc4329d2b/contract';
import startContract from '../../snapshots/1f485d4ef82f51f46ce5d63f43fa0fb8287111853c6256d46b31b10fc4329d2b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4d51d1d63786615f5b75c65d4a37be4f38471952ac4f1ee5e0c09a5ad6da9ced/contract';
import endContract from '../../snapshots/4d51d1d63786615f5b75c65d4a37be4f38471952ac4f1ee5e0c09a5ad6da9ced/contract.json' with { type: 'json' };
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
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_status_check_0f52eb04',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'booking_hold_expiry_23e99e27',
      }),
      this.createTable({
        schema: 'public',
        table: 'PaymentSettlement',
        columns: [
          col('amountPiastres', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('authorizationId', 'text', {
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
          col('kind', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'PaymentSettlement_kind_check_5f50b4db',
            sql`"kind" IN ('CAPTURE', 'VOID')`,
          ),
          checkExpression(
            'PaymentSettlement_status_check_83fae29f',
            sql`"status" IN ('REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'REVIEW')`,
          ),
          checkExpression(
            'payment_settlement_amount_8155a401',
            sql`"amountPiastres" BETWEEN 1 AND 214748364700`,
          ),
          checkExpression(
            'payment_settlement_transaction_2901d1e8',
            sql`"transactionId" ~ '^[1-9][0-9]{0,15}$'`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentAuthorization',
        column: col('nextReconcileAt', 'timestamptz', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentAuthorization',
        column: col('reconciliationComplete', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_status_check_5436125a',
        expression: sql`"status" IN ('RESERVED', 'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'EXPIRED')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'booking_hold_expiry_9066aef4',
        expression: sql`("status" = 'RESERVED' AND "expiresAt" IS NULL) OR ("status" IN ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'EXPIRED') AND "expiresAt" IS NOT NULL)`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentSettlement',
        constraint: 'PaymentSettlement_authorizationId_key',
        columns: ['authorizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentSettlement',
        constraint: 'PaymentSettlement_transactionId_key',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAuthorization',
        index: 'payment_reconcile_due_05983068',
        columns: ['reconciliationComplete', 'nextReconcileAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentSettlement',
        index: 'PaymentSettlement_status_updatedAt_idx_29f913bb',
        columns: ['status', 'updatedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentSettlement',
        foreignKey: {
          name: 'PaymentSettlement_authorizationId_fkey',
          columns: ['authorizationId'],
          references: {
            schema: 'public',
            table: 'PaymentAuthorization',
            columns: ['id'],
          },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
