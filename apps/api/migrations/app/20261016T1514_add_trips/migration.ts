#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/159751b38e455c65e102b8c49d8d33823244fe416c71f4bd9f0fe2439cbca5e1/contract';
import endContract from '../../snapshots/159751b38e455c65e102b8c49d8d33823244fe416c71f4bd9f0fe2439cbca5e1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6fb6684070814203ec1bc4bc39271d3302b3d4adbbb75408bb198431316540e6/contract';
import startContract from '../../snapshots/6fb6684070814203ec1bc4bc39271d3302b3d4adbbb75408bb198431316540e6/contract.json' with { type: 'json' };
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
        table: 'Trip',
        columns: [
          col('arrivalAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('busId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('departureAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('pricePiastres', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('routeId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('SCHEDULED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Trip_status_check_82227794',
            sql`"status" IN ('SCHEDULED', 'CANCELLED')`,
          ),
          checkExpression(
            'trip_price_range_00e5e7c7',
            sql`"pricePiastres" BETWEEN 0 AND 2147483647`,
          ),
          checkExpression(
            'trip_time_order_1a534dcc',
            sql`"arrivalAt" > "departureAt"`,
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_busId_idx_00d1f177',
        columns: ['busId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_busId_status_departureAt_idx_b3d51985',
        columns: ['busId', 'status', 'departureAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_departureAt_idx_03e68107',
        columns: ['departureAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_routeId_departureAt_idx_a5b0938e',
        columns: ['routeId', 'departureAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_routeId_idx_91ae2fd6',
        columns: ['routeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_routeId_fkey',
          columns: ['routeId'],
          references: { schema: 'public', table: 'Route', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_busId_fkey',
          columns: ['busId'],
          references: { schema: 'public', table: 'Bus', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
