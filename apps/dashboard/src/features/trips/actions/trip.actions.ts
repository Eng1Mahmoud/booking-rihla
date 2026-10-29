'use server';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFailure } from '@/shared/lib/apiResult';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListOptions } from '@/shared/lib/readListOptions';
import { readListPage } from '@/shared/lib/readListPage';
import { routeSchema } from '@/features/routes/schemas/routeSchema';
import { stationRowSchema } from '@/features/stations/schemas/stationSchema';
import { busSchema } from '@/features/buses/schemas/busSchema';
import {
  tripSchema,
  tripInputSchema,
  tripListSchema,
  batchInputSchema,
  batchPreviewSchema,
  cancellationSchema,
  type Trip,
  type TripInput,
  type TripListQuery,
  type BatchInput,
} from '../schemas/tripSchema';
export async function getTripOptionsAction() {
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const [routes, buses, stations] = await Promise.all([
    readListOptions('routes', routeSchema),
    readListOptions('admin/buses', busSchema, ''),
    readListOptions('admin/stations', stationRowSchema, ''),
  ]);
  if (!routes.success || !routes.data) return { ...routes, data: undefined };
  if (!buses.success || !buses.data) return { ...buses, data: undefined };
  if (!stations.success || !stations.data)
    return { ...stations, data: undefined };
  return {
    ...routes,
    data: { routes: routes.data, buses: buses.data, stations: stations.data },
  };
}
export async function getTripsAction(input: TripListQuery) {
  const parsed = await parseSchema(tripListSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListPage('trips', parsed.data, tripSchema, {
    routeId: parsed.data.routeId,
    busId: parsed.data.busId,
    status: parsed.data.status,
  });
}
export async function saveTripAction(input: TripInput & { id?: string }) {
  const parsed = await parseSchema(
    tripInputSchema
      .extend({ id: z.uuid().optional() })
      .refine((v) => Date.parse(v.arrivalAt) > Date.parse(v.departureAt)),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<Trip>(id ? 'trips/' + id : 'trips', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteTripAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('trips/' + parsed.data, { method: 'DELETE' });
}
export async function previewTripBatchAction(input: BatchInput) {
  const parsed = await parseSchema(batchInputSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const result = await apiFetch<unknown>('trips/batch/preview', {
    method: 'POST',
    body: parsed.data,
  });
  if (!result.success) return { ...result, data: undefined };
  const response = batchPreviewSchema.safeParse(result.data);
  if (
    !response.success ||
    response.data.totalTrips !== response.data.trips.length ||
    response.data.canCreate !==
      response.data.trips.every((trip) => trip.conflicts.length === 0)
  )
    return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
  return { ...result, data: response.data };
}
export async function createTripBatchAction(input: BatchInput) {
  const parsed = await parseSchema(batchInputSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const result = await apiFetch<unknown>('trips/batch', {
    method: 'POST',
    body: parsed.data,
  });
  if (!result.success) return { ...result, data: undefined };
  const response = z
    .object({
      totalTrips: z.number().int().min(1).max(90),
      trips: z.array(tripSchema).min(1).max(90),
    })
    .safeParse(result.data);
  if (
    !response.success ||
    response.data.totalTrips !== response.data.trips.length
  )
    return apiFailure(502, 'UPSTREAM_ERROR', await getLocale());
  return { ...result, data: { totalTrips: response.data.totalTrips } };
}
export async function cancelTripAction(input: { id: string; reason: string }) {
  const parsed = await parseSchema(cancellationSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  return apiFetch('admin/trips/' + parsed.data.id + '/cancel', {
    method: 'POST',
    body: { reason: parsed.data.reason },
  });
}
