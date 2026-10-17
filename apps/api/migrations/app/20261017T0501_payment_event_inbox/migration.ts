#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/da8b04465317f9615abadd3995ecec96a083823ffa6f819181212a28df3e031c/contract';
import endContract from '../../snapshots/da8b04465317f9615abadd3995ecec96a083823ffa6f819181212a28df3e031c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dd4d1d64f1070080d436320e9e83fc6b050ec149e6243827f8885359a8c19148/contract';
import startContract from '../../snapshots/dd4d1d64f1070080d436320e9e83fc6b050ec149e6243827f8885359a8c19148/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
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
        table: 'PaymentEvent',
        columns: [
          col('eventKey', 'text', {
            notNull: true,
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
          col('orderId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('receivedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('signedJson', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'payment_event_key_ae079da6',
            sql`"eventKey" ~ '^[a-f0-9]{64}$'`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentEvent',
        constraint: 'PaymentEvent_eventKey_key',
        columns: ['eventKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentEvent',
        index: 'PaymentEvent_orderId_receivedAt_idx_55bc2573',
        columns: ['orderId', 'receivedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentEvent',
        index: 'PaymentEvent_transactionId_receivedAt_idx_3c0be1e7',
        columns: ['transactionId', 'receivedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
