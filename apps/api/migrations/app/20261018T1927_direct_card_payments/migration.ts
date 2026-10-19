#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/64aad1cb0138fb67cda4693a07a0f8b6dbe012a0a0f1a096044040e5dde52a8c/contract';
import endContract from '../../snapshots/64aad1cb0138fb67cda4693a07a0f8b6dbe012a0a0f1a096044040e5dde52a8c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e9343db78436ad4bd7a9e4f1495e0c342692dffacf19eafb0faedf97cc93cef5/contract';
import startContract from '../../snapshots/e9343db78436ad4bd7a9e4f1495e0c342692dffacf19eafb0faedf97cc93cef5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameTable({
        schema: 'public',
        table: 'PaymentAuthorization',
        to: 'PaymentSession',
      }),
      ...this.renameColumn({
        schema: 'public',
        table: 'PaymentSettlement',
        column: 'authorizationId',
        to: 'paymentSessionId',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'PaymentSettlement',
        constraint: 'PaymentSettlement_kind_check_5f50b4db',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'PaymentSettlement',
        constraint: 'PaymentSettlement_kind_check_1f13d0e7',
        expression: sql`"kind" IN ('SALE')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
