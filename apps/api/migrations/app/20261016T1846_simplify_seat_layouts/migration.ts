#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/52ff3f3214f6c17ce5390a088b20d25f9c2f3e411157d69b2306c9268b47fbfa/contract';
import endContract from '../../snapshots/52ff3f3214f6c17ce5390a088b20d25f9c2f3e411157d69b2306c9268b47fbfa/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e7dfcf920bc82ad298d3cc354c816a83a4330720f12877f91552a64ed7328799/contract';
import startContract from '../../snapshots/e7dfcf920bc82ad298d3cc354c816a83a4330720f12877f91552a64ed7328799/contract.json' with { type: 'json' };
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
      // Drop the referencing table before its parent.
      this.dropTable({ schema: 'public', table: 'BusLayoutCell' }),
      this.dropTable({ schema: 'public', table: 'BusLayout' }),
      this.addColumn({
        schema: 'public',
        table: 'Bus',
        column: col('seatLayout', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Bus',
        constraint: 'Bus_seatLayout_check_04946dd7',
        expression: sql`"seatLayout" IN ('STANDARD_2_2')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
