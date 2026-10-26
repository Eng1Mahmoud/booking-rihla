#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/64aad1cb0138fb67cda4693a07a0f8b6dbe012a0a0f1a096044040e5dde52a8c/contract';
import startContract from '../../snapshots/64aad1cb0138fb67cda4693a07a0f8b6dbe012a0a0f1a096044040e5dde52a8c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9477561f68d02576a4eda049d586fa2440fab727377d55d7432a42eec75b73ce/contract';
import endContract from '../../snapshots/9477561f68d02576a4eda049d586fa2440fab727377d55d7432a42eec75b73ce/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropTable({ schema: 'public', table: 'AuditLog' })];
  }
}

MigrationCLI.run(import.meta.url, M);
