import type { AuditLogQuery } from '../schemas/auditLogSchema.ts';
function serialize(row: {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}) {
  const { beforeJson, afterJson, ...rest } = row;
  return {
    ...rest,
    before: beforeJson
      ? (JSON.parse(beforeJson) as Record<string, unknown>)
      : null,
    after: afterJson
      ? (JSON.parse(afterJson) as Record<string, unknown>)
      : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}
export const auditLogService = {
  async list({ limit, offset, from, to, ...filters }: AuditLogQuery) {
    const { db } = await import('../prisma/db.ts');
    let query = db.orm.public.AuditLog.where(filters);
    if (from) query = query.where((row) => row.createdAt.gte(from));
    if (to) query = query.where((row) => row.createdAt.lte(to));
    const rows = await query
      .orderBy([(row) => row.createdAt.desc(), (row) => row.id.desc()])
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(serialize);
  },
  async findById(id: string) {
    const { db } = await import('../prisma/db.ts');
    const row = await db.orm.public.AuditLog.where({ id }).first();
    return row ? serialize(row) : null;
  },
};
export type AuditLogService = typeof auditLogService;
