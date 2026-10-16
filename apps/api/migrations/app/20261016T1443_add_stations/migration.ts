#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/158331a0573fab018bedb3a95e7f5cbcb6b0a7b114afaf63c549580b2832122b/contract';
import endContract from '../../snapshots/158331a0573fab018bedb3a95e7f5cbcb6b0a7b114afaf63c549580b2832122b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c5aa9215285b1650505b2fd8fa2d24d30afafae2edbb2b58fd9e9116b2ab2a96/contract';
import startContract from '../../snapshots/c5aa9215285b1650505b2fd8fa2d24d30afafae2edbb2b58fd9e9116b2ab2a96/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Station',
        columns: [
          col('cityId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
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
      this.createIndex({
        schema: 'public',
        table: 'Station',
        index: 'Station_cityId_idx_1ab1b247',
        columns: ['cityId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Station',
        foreignKey: {
          name: 'Station_cityId_fkey',
          columns: ['cityId'],
          references: { schema: 'public', table: 'City', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
