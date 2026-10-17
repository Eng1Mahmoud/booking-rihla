import type { db as database } from '../prisma/db.ts';
import type { AuthContext } from './sessionService.ts';
export type AuditActor = Pick<AuthContext, 'user'>;
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
// Explicit allowlist: never serialize whole User/session/request objects.
const fields = {
  City: ['nameAr', 'nameEn'],
  Station: ['nameAr', 'nameEn', 'cityId'],
  Route: [
    'originStationId',
    'destinationStationId',
    'estimatedDurationMinutes',
    'isActive',
  ],
  Bus: [
    'plateNumber',
    'seatCount',
    'seatLayout',
    'isActive',
    'busTypeId',
    'amenityIds',
  ],
  BusType: ['code', 'nameAr', 'nameEn'],
  Amenity: ['code', 'nameAr', 'nameEn'],
  Trip: [
    'routeId',
    'busId',
    'departureAt',
    'arrivalAt',
    'pricePiastres',
    'status',
  ],
  User: ['role', 'isActive'],
} as const;
export type AuditEntity = keyof typeof fields;
function snapshot(entity: AuditEntity, row: object | null): string | null {
  if (!row) return null;
  const source = row as Record<string, unknown>;
  return JSON.stringify(
    Object.fromEntries(
      fields[entity]
        .filter((key) => key in source)
        .map((key) => {
          const value = source[key];
          return [
            key,
            Array.isArray(value)
              ? [...value].sort()
              : (key === 'departureAt' || key === 'arrivalAt') &&
                  typeof value === 'string'
                ? new Date(value).toISOString()
                : value,
          ];
        }),
    ),
  );
}
export async function recordAudit(
  tx: Transaction,
  actor: AuditActor | undefined,
  entity: AuditEntity,
  entityId: string,
  before: object | null,
  after: object | null,
  action?: 'BOOTSTRAP',
) {
  const beforeJson = snapshot(entity, before),
    afterJson = snapshot(entity, after);
  if (beforeJson === afterJson) return;
  await tx.orm.public.AuditLog.create({
    actorId: actor?.user.id ?? null,
    actorRole: actor?.user.role ?? null,
    entity,
    entityId,
    action:
      action ??
      (before === null ? 'CREATE' : after === null ? 'DELETE' : 'UPDATE'),
    beforeJson,
    afterJson,
  });
}
