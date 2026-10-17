#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4d51d1d63786615f5b75c65d4a37be4f38471952ac4f1ee5e0c09a5ad6da9ced/contract';
import startContract from '../../snapshots/4d51d1d63786615f5b75c65d4a37be4f38471952ac4f1ee5e0c09a5ad6da9ced/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b8d7f500780836e4a8ca32c0d9ba8b900f289c24a57eacef4ef634f4827ee9d3/contract';
import endContract from '../../snapshots/b8d7f500780836e4a8ca32c0d9ba8b900f289c24a57eacef4ef634f4827ee9d3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'PaymentAuthorization',
        constraint: 'payment_authorization_references_e5a362ee',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'PaymentAuthorization',
        constraint: 'payment_authorization_references_f4507849',
        expression: sql`"intentionId" IS NULL OR "orderId" IS NOT NULL`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
