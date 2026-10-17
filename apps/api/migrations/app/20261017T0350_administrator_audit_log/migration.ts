#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/073ef5bb5ade4ddc745ab923833f155e136af0e69f7eeace71771c5661ea2b68/contract';
import startContract from '../../snapshots/073ef5bb5ade4ddc745ab923833f155e136af0e69f7eeace71771c5661ea2b68/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e91f2b659cec7b7d1457a3320ee84afd8f038a4431a0ad26609f6564025a49a9/contract';
import endContract from '../../snapshots/e91f2b659cec7b7d1457a3320ee84afd8f038a4431a0ad26609f6564025a49a9/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
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
        table: 'AuditLog',
        columns: [
          col('action', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorRole', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('afterJson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('beforeJson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('entity', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('entityId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_actorId_createdAt_id_idx_a358fe34',
        columns: ['actorId', 'createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_createdAt_id_idx_3855cff1',
        columns: ['createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_entity_entityId_createdAt_id_idx_87a5b01a',
        columns: ['entity', 'entityId', 'createdAt', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
