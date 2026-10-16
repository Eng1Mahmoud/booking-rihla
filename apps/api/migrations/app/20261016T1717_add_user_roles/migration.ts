#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/03804b46fac041f0e00910206042e2113d173f5cf77e5afc59cc211163701ec2/contract';
import startContract from '../../snapshots/03804b46fac041f0e00910206042e2113d173f5cf77e5afc59cc211163701ec2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d2d889f19321aa0b39f1d4a8a148b77003a9939dd31e1d0d4a3f014649254025/contract';
import endContract from '../../snapshots/d2d889f19321aa0b39f1d4a8a148b77003a9939dd31e1d0d4a3f014649254025/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  lit,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('role', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_a8bee70d',
        expression: sql`"role" IN ('USER', 'ADMIN', 'SUPER_ADMIN')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
