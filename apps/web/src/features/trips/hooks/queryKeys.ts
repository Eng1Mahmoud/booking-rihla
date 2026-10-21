import type { Search } from '../schemas/searchSchema';

export const tripKeys = {
  catalog: (locale: string) => ['trips', 'catalog', locale] as const,
  search: (locale: string, search: Search) =>
    ['trips', 'search', locale, search] as const,
  detail: (locale: string, id: string) =>
    ['trips', 'detail', locale, id] as const,
};
