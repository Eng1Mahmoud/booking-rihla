#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c5aa9215285b1650505b2fd8fa2d24d30afafae2edbb2b58fd9e9116b2ab2a96/contract';
import endContract from '../../snapshots/c5aa9215285b1650505b2fd8fa2d24d30afafae2edbb2b58fd9e9116b2ab2a96/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'City',
        columns: [
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('nameAr', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('nameEn', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
