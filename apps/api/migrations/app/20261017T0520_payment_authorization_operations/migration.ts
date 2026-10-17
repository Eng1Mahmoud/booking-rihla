#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1f485d4ef82f51f46ce5d63f43fa0fb8287111853c6256d46b31b10fc4329d2b/contract';
import endContract from '../../snapshots/1f485d4ef82f51f46ce5d63f43fa0fb8287111853c6256d46b31b10fc4329d2b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fb461ba352a14da7f3886e2847c2f326b784549ab529fad87cbc59ea8559cb61/contract';
import startContract from '../../snapshots/fb461ba352a14da7f3886e2847c2f326b784549ab529fad87cbc59ea8559cb61/contract.json' with { type: 'json' };
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
        table: 'PaymentAuthorization',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('encryptedCheckoutUrl', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('integrationId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('intentionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('paymentAttemptId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTING'),
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
            'PaymentAuthorization_status_check_c1795974',
            sql`"status" IN ('REQUESTING', 'READY', 'UNKNOWN', 'FAILED', 'EXPIRED')`,
          ),
          checkExpression(
            'payment_authorization_checkout_0fc4d81c',
            sql`("status" = 'READY' AND "encryptedCheckoutUrl" IS NOT NULL AND "intentionId" IS NOT NULL) OR ("status" <> 'READY' AND "encryptedCheckoutUrl" IS NULL)`,
          ),
          checkExpression(
            'payment_authorization_references_e5a362ee',
            sql`("intentionId" IS NULL AND "orderId" IS NULL) OR ("intentionId" IS NOT NULL AND "orderId" IS NOT NULL)`,
          ),
          checkExpression(
            'payment_authorization_scope_37324968',
            sql`"integrationId" ~ '^[1-9][0-9]*$' AND "ownerId" ~ '^[1-9][0-9]*$'`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentAuthorization',
        constraint: 'PaymentAuthorization_paymentAttemptId_key',
        columns: ['paymentAttemptId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentAuthorization',
        constraint: 'PaymentAuthorization_intentionId_key',
        columns: ['intentionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentAuthorization',
        constraint: 'PaymentAuthorization_orderId_key',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAuthorization',
        index: 'PaymentAuthorization_status_updatedAt_idx_29f913bb',
        columns: ['status', 'updatedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentAuthorization',
        foreignKey: {
          name: 'PaymentAuthorization_paymentAttemptId_fkey',
          columns: ['paymentAttemptId'],
          references: {
            schema: 'public',
            table: 'PaymentAttempt',
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
