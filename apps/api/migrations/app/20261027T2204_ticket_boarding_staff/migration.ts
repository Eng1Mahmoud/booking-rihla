#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/55a33243170f0bacb55d425a534b178dd97a1eb82093983105529e2a4a624586/contract';
import endContract from '../../snapshots/55a33243170f0bacb55d425a534b178dd97a1eb82093983105529e2a4a624586/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9477561f68d02576a4eda049d586fa2440fab727377d55d7432a42eec75b73ce/contract';
import startContract from '../../snapshots/9477561f68d02576a4eda049d586fa2440fab727377d55d7432a42eec75b73ce/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_a8bee70d',
      }),
      this.addColumn({
        schema: 'public',
        table: 'BookingSeat',
        column: col('boardedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BookingSeat',
        column: col('boardedByUserId', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_8b3757fc',
        expression: sql`"role" IN ('USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingSeat',
        index: 'BookingSeat_boardedByUserId_idx_112466dc',
        columns: ['boardedByUserId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingSeat',
        foreignKey: {
          name: 'BookingSeat_boardedByUserId_fkey',
          columns: ['boardedByUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
