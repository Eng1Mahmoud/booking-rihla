#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3aee57fb27e3013f2f83b4e064e0c7adfd52ca06bf7bf5b8b0b6dd1910169007/contract';
import startContract from '../../snapshots/3aee57fb27e3013f2f83b4e064e0c7adfd52ca06bf7bf5b8b0b6dd1910169007/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e7dfcf920bc82ad298d3cc354c816a83a4330720f12877f91552a64ed7328799/contract';
import endContract from '../../snapshots/e7dfcf920bc82ad298d3cc354c816a83a4330720f12877f91552a64ed7328799/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
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
        table: 'BusLayout',
        columns: [
          col('busId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('columnCount', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('rowCount', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'bus_layout_dimensions_e07be16e',
            sql`"rowCount" BETWEEN 2 AND 51 AND "columnCount" BETWEEN 3 AND 8`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusLayoutCell',
        columns: [
          col('column', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('kind', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('layoutId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('row', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('seatId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BusLayoutCell_kind_check_2cef50ca',
            sql`"kind" IN ('SEAT', 'AISLE', 'DRIVER', 'DOOR', 'EMPTY')`,
          ),
          checkExpression(
            'bus_layout_cell_coordinates_163905df',
            sql`row BETWEEN 0 AND 50 AND "column" BETWEEN 0 AND 7`,
          ),
          checkExpression(
            'bus_layout_cell_seat_5946a95f',
            sql`(kind = 'SEAT' AND "seatId" IS NOT NULL) OR (kind <> 'SEAT' AND "seatId" IS NULL)`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusLayout',
        constraint: 'BusLayout_busId_key',
        columns: ['busId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusLayoutCell',
        constraint: 'BusLayoutCell_seatId_key',
        columns: ['seatId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusLayoutCell',
        constraint: 'BusLayoutCell_layoutId_row_column_key',
        columns: ['layoutId', 'row', 'column'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusLayoutCell',
        index: 'BusLayoutCell_layoutId_idx_dc26ea26',
        columns: ['layoutId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusLayout',
        foreignKey: {
          name: 'BusLayout_busId_fkey',
          columns: ['busId'],
          references: { schema: 'public', table: 'Bus', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusLayoutCell',
        foreignKey: {
          name: 'BusLayoutCell_layoutId_fkey',
          columns: ['layoutId'],
          references: { schema: 'public', table: 'BusLayout', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusLayoutCell',
        foreignKey: {
          name: 'BusLayoutCell_seatId_fkey',
          columns: ['seatId'],
          references: { schema: 'public', table: 'BusSeat', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
