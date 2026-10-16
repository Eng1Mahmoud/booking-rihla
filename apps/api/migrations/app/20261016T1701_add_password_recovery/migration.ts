#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/03804b46fac041f0e00910206042e2113d173f5cf77e5afc59cc211163701ec2/contract';
import endContract from '../../snapshots/03804b46fac041f0e00910206042e2113d173f5cf77e5afc59cc211163701ec2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/30be84a68f66ba076c6fef21e460262255c33f4fb22c55f4bb3b094e525dff1f/contract';
import startContract from '../../snapshots/30be84a68f66ba076c6fef21e460262255c33f4fb22c55f4bb3b094e525dff1f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
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
        table: 'PasswordReset',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('codeHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('consumedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('resendAfter', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('sendCount', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('windowStartedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'password_reset_limits_97d2a4bd',
            sql`attempts BETWEEN 0 AND 5 AND "sendCount" BETWEEN 1 AND 5`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'EmailOutbox',
        column: col('purpose', 'text', {
          notNull: true,
          default: lit('VERIFY_EMAIL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'EmailOutbox',
        constraint: 'EmailOutbox_purpose_check_472ba6b3',
        expression: sql`"purpose" IN ('VERIFY_EMAIL', 'PASSWORD_RESET', 'PASSWORD_CHANGED')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'PasswordReset',
        constraint: 'PasswordReset_userId_key',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PasswordReset',
        foreignKey: {
          name: 'PasswordReset_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
