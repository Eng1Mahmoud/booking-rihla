'use server';
import { z } from 'zod';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListOptions } from '@/shared/lib/readListOptions';
import { readWindowPage } from '@/shared/lib/readWindowPage';
import { stationRowSchema } from '@/features/stations/schemas/stationSchema';
import {
  routeSchema,
  routeInputSchema,
  routeListSchema,
  type Route,
  type RouteInput,
  type RouteListQuery,
} from '../schemas/routeSchema';
export async function getRouteStationsAction() {
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListOptions('admin/stations', stationRowSchema);
}
export async function getRoutesAction(input: RouteListQuery) {
  const parsed = await parseSchema(routeListSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readWindowPage('routes', parsed.data, routeSchema, {
    originStationId: parsed.data.originStationId,
    destinationStationId: parsed.data.destinationStationId,
    isActive: parsed.data.isActive,
  });
}
export async function saveRouteAction(input: RouteInput & { id?: string }) {
  const parsed = await parseSchema(
    routeInputSchema
      .extend({ id: z.uuid().optional() })
      .refine((v) => v.originStationId !== v.destinationStationId),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<Route>(id ? 'routes/' + id : 'routes', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteRouteAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('routes/' + parsed.data, { method: 'DELETE' });
}
