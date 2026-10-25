'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaginationState, Updater } from '@tanstack/react-table';

export function useDataTableState<TFilters extends Record<string, string>>({
  initialFilters,
  pageSize = 20,
}: {
  initialFilters: TFilters;
  pageSize?: number;
}) {
  const defaults = useRef(initialFilters);
  const [state, setState] = useState({
    search: '',
    appliedSearch: '',
    filters: initialFilters,
    pagination: { pageIndex: 0, pageSize },
  });
  useEffect(() => {
    if (state.search.trim() === state.appliedSearch) return;
    const timer = setTimeout(
      () =>
        setState((current) => ({
          ...current,
          appliedSearch: current.search.trim(),
          pagination: { ...current.pagination, pageIndex: 0 },
        })),
      300,
    );
    return () => clearTimeout(timer);
  }, [state.search, state.appliedSearch]);

  const setSearch = useCallback(
    (search: string) => setState((current) => ({ ...current, search })),
    [],
  );
  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      setState((current) =>
        current.filters[key] === value
          ? current
          : {
              ...current,
              filters: { ...current.filters, [key]: value },
              appliedSearch: current.search.trim(),
              pagination: { ...current.pagination, pageIndex: 0 },
            },
      );
    },
    [],
  );
  const setPagination = useCallback((update: Updater<PaginationState>) => {
    setState((current) => ({
      ...current,
      pagination:
        typeof update === 'function' ? update(current.pagination) : update,
    }));
  }, []);
  const resetFilters = useCallback((filters: TFilters = defaults.current) => {
    setState((current) => ({
      ...current,
      search: '',
      appliedSearch: '',
      filters,
      pagination: { ...current.pagination, pageIndex: 0 },
    }));
  }, []);
  const params = useMemo(
    () => ({
      search: state.appliedSearch,
      filters: state.filters,
      limit: state.pagination.pageSize,
      offset: state.pagination.pageIndex * state.pagination.pageSize,
    }),
    [state.appliedSearch, state.filters, state.pagination],
  );

  return {
    search: state.search,
    filters: state.filters,
    pagination: state.pagination,
    params,
    isSearching: state.search.trim() !== state.appliedSearch,
    hasFilters: Boolean(
      state.search.trim() || Object.values(state.filters).some(Boolean),
    ),
    setSearch,
    setFilter,
    setPagination,
    resetFilters,
  };
}
export type DataTableState<TFilters extends Record<string, string>> =
  ReturnType<typeof useDataTableState<TFilters>>;
