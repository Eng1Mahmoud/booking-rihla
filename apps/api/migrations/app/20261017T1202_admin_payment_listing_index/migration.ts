#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b8d7f500780836e4a8ca32c0d9ba8b900f289c24a57eacef4ef634f4827ee9d3/contract';
import startContract from '../../snapshots/b8d7f500780836e4a8ca32c0d9ba8b900f289c24a57eacef4ef634f4827ee9d3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fbcc5d303193ba19f660a1af9fc04176b313772e5f97b1d607309474009884a0/contract';
import endContract from '../../snapshots/fbcc5d303193ba19f660a1af9fc04176b313772e5f97b1d607309474009884a0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'PaymentAttempt',
        index: 'payment_attempt_created_3855cff1',
        columns: ['createdAt', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
