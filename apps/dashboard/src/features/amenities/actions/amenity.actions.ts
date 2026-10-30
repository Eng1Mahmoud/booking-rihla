'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ListPage } from '@/shared/types/list';
import type { AmenityInput } from '../schemas/amenitySchema';
import type { Amenity } from '../types/amenity';

export async function getAmenitiesAction(query: string) {
  return apiFetch<ListPage<Amenity>>('admin/amenities?' + query);
}

export async function saveAmenityAction(input: AmenityInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Amenity>(id ? 'amenities/' + id : 'amenities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteAmenityAction(id: string) {
  return apiFetch<void>('amenities/' + id, { method: 'DELETE' });
}

export async function getAmenityAction(id: string) {
  return apiFetch<Amenity>('amenities/' + encodeURIComponent(id));
}
