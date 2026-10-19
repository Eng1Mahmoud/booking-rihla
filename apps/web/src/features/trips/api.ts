import { apiGet } from '@/lib/api';
export type City = { id: string; nameAr: string; nameEn: string };
export type Station = City & { cityId: string };
async function listCatalog<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = (
      await apiGet<{ data: T[] }>(path + '?limit=100&offset=' + offset)
    ).data;
    rows.push(...page);
    if (page.length < 100) return rows;
  }
  throw new Error('Catalog pagination limit reached');
}
export async function getSearchCatalog() {
  const [cities, stations] = await Promise.all([
    listCatalog<City>('cities'),
    listCatalog<Station>('stations'),
  ]);
  return { cities, stations };
}
export async function getCities() {
  return listCatalog<City>('cities');
}
