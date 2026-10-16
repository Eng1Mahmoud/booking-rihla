#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1ebb0db2fc47978ee5ffce8c10fa3b7ded85c944f4a7fc1fdebc698df262aa36/contract';
import startContract from '../../snapshots/1ebb0db2fc47978ee5ffce8c10fa3b7ded85c944f4a7fc1fdebc698df262aa36/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/30be84a68f66ba076c6fef21e460262255c33f4fb22c55f4bb3b094e525dff1f/contract';
import endContract from '../../snapshots/30be84a68f66ba076c6fef21e460262255c33f4fb22c55f4bb3b094e525dff1f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
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
        table: 'RefreshToken',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sessionId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenHash', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('usedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('revokedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('lockedUntil', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('loginFailures', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'RefreshToken',
        constraint: 'RefreshToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'user_login_failures_973ea723',
        expression: sql`"loginFailures" BETWEEN 0 AND 5`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_userId_revokedAt_idx_eae4cbef',
        columns: ['userId', 'revokedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RefreshToken',
        foreignKey: {
          name: 'RefreshToken_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'Session', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
