#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1f5bc6bfc0ff862c29e84fe643773925b533dce9d1823692335e0346b639944f/contract';
import startContract from '../../snapshots/1f5bc6bfc0ff862c29e84fe643773925b533dce9d1823692335e0346b639944f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3aee57fb27e3013f2f83b4e064e0c7adfd52ca06bf7bf5b8b0b6dd1910169007/contract';
import endContract from '../../snapshots/3aee57fb27e3013f2f83b4e064e0c7adfd52ca06bf7bf5b8b0b6dd1910169007/contract.json' with { type: 'json' };
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
        table: 'Amenity',
        columns: [
          col('code', 'text', {
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
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'amenity_code_2073f902',
            sql`code ~ '^[A-Z][A-Z0-9_]{0,31}$'`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusAmenity',
        columns: [
          col('amenityId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('busId', 'text', {
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
      this.createTable({
        schema: 'public',
        table: 'BusType',
        columns: [
          col('code', 'text', {
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
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'bus_type_code_2073f902',
            sql`code ~ '^[A-Z][A-Z0-9_]{0,31}$'`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Bus',
        column: col('busTypeId', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Amenity',
        constraint: 'Amenity_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusAmenity',
        constraint: 'BusAmenity_busId_amenityId_key',
        columns: ['busId', 'amenityId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusType',
        constraint: 'BusType_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Bus',
        index: 'Bus_busTypeId_idx_00e74d42',
        columns: ['busTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusAmenity',
        index: 'BusAmenity_amenityId_idx_28149e7b',
        columns: ['amenityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusAmenity',
        index: 'BusAmenity_busId_idx_00d1f177',
        columns: ['busId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusAmenity',
        foreignKey: {
          name: 'BusAmenity_busId_fkey',
          columns: ['busId'],
          references: { schema: 'public', table: 'Bus', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusAmenity',
        foreignKey: {
          name: 'BusAmenity_amenityId_fkey',
          columns: ['amenityId'],
          references: { schema: 'public', table: 'Amenity', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Bus',
        foreignKey: {
          name: 'Bus_busTypeId_fkey',
          columns: ['busTypeId'],
          references: { schema: 'public', table: 'BusType', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
