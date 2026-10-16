#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/105cd6d1e915bc27ceb6897a4d63f01215f213afc180a7012c2674e709d76985/contract';
import endContract from '../../snapshots/105cd6d1e915bc27ceb6897a4d63f01215f213afc180a7012c2674e709d76985/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/52ff3f3214f6c17ce5390a088b20d25f9c2f3e411157d69b2306c9268b47fbfa/contract';
import startContract from '../../snapshots/52ff3f3214f6c17ce5390a088b20d25f9c2f3e411157d69b2306c9268b47fbfa/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_createdAt_id_idx_3855cff1',
        columns: ['createdAt', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
