export type ListQuery = {
  search: string;
  limit: number;
  offset: number;
};

export type ListPage<T> = { items: T[]; total: number };
