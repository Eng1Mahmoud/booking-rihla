#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/dd4d1d64f1070080d436320e9e83fc6b050ec149e6243827f8885359a8c19148/contract';
import endContract from '../../snapshots/dd4d1d64f1070080d436320e9e83fc6b050ec149e6243827f8885359a8c19148/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e91f2b659cec7b7d1457a3320ee84afd8f038a4431a0ad26609f6564025a49a9/contract';
import startContract from '../../snapshots/e91f2b659cec7b7d1457a3320ee84afd8f038a4431a0ad26609f6564025a49a9/contract.json' with { type: 'json' };
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
        table: 'Booking',
        constraint: 'Booking_status_check_78f85807',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'BookingSeat',
        constraint: 'BookingSeat_tripId_seatId_key',
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('expiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BookingSeat',
        column: col('releasedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_status_check_0f52eb04',
        expression: sql`"status" IN ('RESERVED', 'PENDING_PAYMENT', 'EXPIRED')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Booking',
        constraint: 'booking_hold_expiry_23e99e27',
        expression: sql`("status" = 'RESERVED' AND "expiresAt" IS NULL) OR ("status" IN ('PENDING_PAYMENT', 'EXPIRED') AND "expiresAt" IS NOT NULL)`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_status_expiresAt_tripId_idx_bd4e6fd1',
        columns: ['status', 'expiresAt', 'tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingSeat',
        index: 'booking_seat_active_unique_225b95a2',
        columns: ['tripId', 'seatId'],
        extras: { where: sql`"releasedAt" IS NULL`, unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
