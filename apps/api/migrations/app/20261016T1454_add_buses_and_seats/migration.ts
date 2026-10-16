#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/158331a0573fab018bedb3a95e7f5cbcb6b0a7b114afaf63c549580b2832122b/contract';
import startContract from '../../snapshots/158331a0573fab018bedb3a95e7f5cbcb6b0a7b114afaf63c549580b2832122b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/da409af4617854fc8a7bdf6f2004b5568a7d0acde1b097d48cae45dd231cdba4/contract';
import endContract from '../../snapshots/da409af4617854fc8a7bdf6f2004b5568a7d0acde1b097d48cae45dd231cdba4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
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
        table: 'Bus',
        columns: [
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('plateNumber', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('seatCount', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'bus_seat_count_range_2c34aaa7',
            sql`"seatCount" BETWEEN 1 AND 100`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusSeat',
        columns: [
          col('busId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('number', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'bus_seat_number_range_608febde',
            sql`number BETWEEN 1 AND 100`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Bus',
        constraint: 'Bus_plateNumber_key',
        columns: ['plateNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusSeat',
        constraint: 'BusSeat_busId_number_key',
        columns: ['busId', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusSeat',
        index: 'BusSeat_busId_idx_00d1f177',
        columns: ['busId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusSeat',
        foreignKey: {
          name: 'BusSeat_busId_fkey',
          columns: ['busId'],
          references: { schema: 'public', table: 'Bus', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
