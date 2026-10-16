#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/073ef5bb5ade4ddc745ab923833f155e136af0e69f7eeace71771c5661ea2b68/contract';
import endContract from '../../snapshots/073ef5bb5ade4ddc745ab923833f155e136af0e69f7eeace71771c5661ea2b68/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/105cd6d1e915bc27ceb6897a4d63f01215f213afc180a7012c2674e709d76985/contract';
import startContract from '../../snapshots/105cd6d1e915bc27ceb6897a4d63f01215f213afc180a7012c2674e709d76985/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_phone_idx_8db23f45',
        columns: ['phone'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_role_createdAt_id_idx_522b1764',
        columns: ['role', 'createdAt', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
