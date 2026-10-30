'use server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure } from '@/shared/lib/apiResult';
import { getLocale } from 'next-intl/server';
import type { StationRow } from '@/features/stations/types/station';
import type { Route, RouteInput } from '../schemas/routeSchema';
export async function getRouteStationsAction() {
  const stations: StationRow[] = [];
  const locale = await getLocale();
  for (let offset = 0; offset <= 100000; offset += 100) {
    const params = new URLSearchParams({
      search: '',
      locale,
      limit: '100',
      offset: String(offset),
    });
    const page = await apiFetch<{ items: StationRow[]; total: number }>(
      'admin/stations?' + params,
    );
    if (!page.success || !page.data) return { ...page, data: undefined };
    stations.push(...page.data.items);
    if (stations.length >= page.data.total || page.data.items.length < 100)
      return { ...page, data: stations };
  }
  return apiFailure(502, 'UPSTREAM_ERROR', locale);
}
export async function getRoutesAction(query: string) {
  return apiFetch<{ items: Route[]; total: number }>('routes?' + query);
}
export async function saveRouteAction(input: RouteInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Route>(id ? 'routes/' + id : 'routes', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteRouteAction(id: string) {
  return apiFetch<void>('routes/' + id, { method: 'DELETE' });
}

export async function getRouteAction(id: string) {
  return apiFetch<Route>('routes/' + encodeURIComponent(id));
}
