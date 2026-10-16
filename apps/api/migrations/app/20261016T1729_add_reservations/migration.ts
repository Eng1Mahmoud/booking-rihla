#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1f5bc6bfc0ff862c29e84fe643773925b533dce9d1823692335e0346b639944f/contract';
import endContract from '../../snapshots/1f5bc6bfc0ff862c29e84fe643773925b533dce9d1823692335e0346b639944f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d2d889f19321aa0b39f1d4a8a148b77003a9939dd31e1d0d4a3f014649254025/contract';
import startContract from '../../snapshots/d2d889f19321aa0b39f1d4a8a148b77003a9939dd31e1d0d4a3f014649254025/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
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
        table: 'Booking',
        columns: [
          col('contactPhone', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('reference', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('seatCount', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('RESERVED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalPiastres', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('tripId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('unitPricePiastres', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Booking_status_check_78f85807',
            sql`"status" IN ('RESERVED')`,
          ),
          checkExpression(
            'booking_price_total_9fa87c89',
            sql`"unitPricePiastres" BETWEEN 0 AND 2147483647 AND "totalPiastres" = "unitPricePiastres"::bigint * "seatCount"`,
          ),
          checkExpression(
            'booking_seat_count_2c34aaa7',
            sql`"seatCount" BETWEEN 1 AND 100`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BookingSeat',
        columns: [
          col('bookingId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('passengerName', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('seatId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('seatNumber', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tripId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'booking_seat_number_eb6d2b3f',
            sql`"seatNumber" BETWEEN 1 AND 100`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_reference_key',
        columns: ['reference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_id_tripId_key',
        columns: ['id', 'tripId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BookingSeat',
        constraint: 'BookingSeat_tripId_seatId_key',
        columns: ['tripId', 'seatId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_tripId_idx_75da6d97',
        columns: ['tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_userId_createdAt_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingSeat',
        index: 'BookingSeat_bookingId_tripId_idx_52502076',
        columns: ['bookingId', 'tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingSeat',
        index: 'BookingSeat_seatId_idx_3076c3cd',
        columns: ['seatId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingSeat',
        foreignKey: {
          name: 'BookingSeat_bookingId_tripId_fkey',
          columns: ['bookingId', 'tripId'],
          references: {
            schema: 'public',
            table: 'Booking',
            columns: ['id', 'tripId'],
          },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingSeat',
        foreignKey: {
          name: 'BookingSeat_seatId_fkey',
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
