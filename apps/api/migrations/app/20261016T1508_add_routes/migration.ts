#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6fb6684070814203ec1bc4bc39271d3302b3d4adbbb75408bb198431316540e6/contract';
import endContract from '../../snapshots/6fb6684070814203ec1bc4bc39271d3302b3d4adbbb75408bb198431316540e6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da409af4617854fc8a7bdf6f2004b5568a7d0acde1b097d48cae45dd231cdba4/contract';
import startContract from '../../snapshots/da409af4617854fc8a7bdf6f2004b5568a7d0acde1b097d48cae45dd231cdba4/contract.json' with { type: 'json' };
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
        table: 'Route',
        columns: [
          col('destinationStationId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('estimatedDurationMinutes', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('originStationId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'route_distinct_stations_0ade44e1',
            sql`"originStationId" <> "destinationStationId"`,
          ),
          checkExpression(
            'route_duration_range_c4fded6c',
            sql`"estimatedDurationMinutes" BETWEEN 1 AND 10080`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Route',
        constraint: 'Route_originStationId_destinationStationId_key',
        columns: ['originStationId', 'destinationStationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Route',
        index: 'Route_destinationStationId_idx_f43d62cb',
        columns: ['destinationStationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Route',
        index: 'Route_originStationId_idx_487c4fe1',
        columns: ['originStationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Route',
        foreignKey: {
          name: 'Route_originStationId_fkey',
          columns: ['originStationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Route',
        foreignKey: {
          name: 'Route_destinationStationId_fkey',
          columns: ['destinationStationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
