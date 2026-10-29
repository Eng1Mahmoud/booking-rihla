'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import {
  listQuerySchema,
  type ListPage,
  type ListQuery,
} from '@/shared/schemas/listSchema';
import {
  busTypeSchema,
  busTypeIdSchema,
  saveBusTypeSchema,
  type BusTypeInput,
} from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export async function getBusTypesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<BusType>>> {
  const parsed = await parseSchema(listQuerySchema, input);
  if (!parsed.success) return parsed.error;
  return readListPage('admin/bus-types', parsed.data, busTypeSchema);
}

export async function saveBusTypeAction(input: BusTypeInput & { id?: string }) {
  const parsed = await parseSchema(saveBusTypeSchema, input);
  if (!parsed.success) return parsed.error;
  const { id, ...body } = parsed.data;
  return apiFetch<BusType>(id ? 'bus-types/' + id : 'bus-types', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteBusTypeAction(id: string) {
  const parsed = await parseSchema(busTypeIdSchema, id);
  if (!parsed.success) return parsed.error;
  return apiFetch<void>('bus-types/' + parsed.data, { method: 'DELETE' });
}
