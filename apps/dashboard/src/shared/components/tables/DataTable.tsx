'use client';
import { useCallback, useEffect, type ReactNode } from 'react';
import {
  useTable,
  type RowData,
  type PaginationState,
  type Updater,
} from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import {
  getTablePagination,
  DEFAULT_TABLE_PAGE_SIZE,
} from '@/shared/lib/pagination';
import {
  dataTableFeatures,
  type DataTableColumn,
} from '@/shared/lib/dataTable';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { DataTableToolbar, type DataTableSearch } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';

export function DataTable<TData extends RowData>({
  columns,
  data,
  rowCount,
  tableClassName,
  getRowId,
  caption,
  search,
  filters,
  isLoading = false,
  isFetching = false,
  onRefresh,
  emptyState,
  beforeTable,
}: {
  columns: DataTableColumn<TData>[];
  data: TData[];
  rowCount?: number;
  tableClassName?: string;
  getRowId: (row: TData) => string;
  caption: string;
  search?: DataTableSearch;
  filters?: ReactNode;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  emptyState?: ReactNode;
  beforeTable?: ReactNode;
}) {
  const urlParams = useSearchParams();
  const pagination = getTablePagination(urlParams);
  const hasActiveFilters = Array.from(urlParams.entries()).some(
    ([name, value]) => name.startsWith('filter.') && Boolean(value.trim()),
  );
  const updatePagination = useCallback((update: Updater<PaginationState>) => {
    const url = new URL(window.location.href);
    const current = getTablePagination(url.searchParams);
    const next = typeof update === 'function' ? update(current) : update;
    if (next.pageSize === DEFAULT_TABLE_PAGE_SIZE)
      url.searchParams.delete('limit');
    else url.searchParams.set('limit', String(next.pageSize));
    if (next.pageIndex)
      url.searchParams.set('offset', String(next.pageIndex * next.pageSize));
    else url.searchParams.delete('offset');
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url.pathname + url.search + url.hash);
  }, []);
  const t = useTranslations('DataTable');
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    manualPagination: true,
    rowCount: rowCount ?? 0,
    state: { pagination },
    onPaginationChange: updatePagination,
  });
  const { pageIndex, pageSize } = pagination;
  useEffect(() => {
    if (rowCount === undefined || isFetching || isLoading) return;
    const lastPage = Math.max(0, Math.ceil(rowCount / pageSize) - 1);
    if (pageIndex > lastPage)
      updatePagination((current) => ({ ...current, pageIndex: lastPage }));
  }, [rowCount, isFetching, isLoading, pageIndex, pageSize, updatePagination]);
  const pending =
    isLoading ||
    rowCount === undefined ||
    (rowCount !== undefined &&
      rowCount > 0 &&
      pageIndex * pageSize >= rowCount);
  return (
    <div
      data-slot="data-table"
      className="min-w-0 overflow-hidden rounded-2xl border bg-card"
      aria-busy={isFetching}
    >
      {(search || filters || onRefresh) && (
        <DataTableToolbar
          search={search}
          filters={filters}
          isFetching={isFetching}
          onRefresh={onRefresh}
        />
      )}
      {beforeTable}
      {isLoading && (
        <div role="status" aria-label={t('loading')} className="grid gap-4 p-5">
          <span className="sr-only">{t('loading')}</span>
          <Skeleton className="h-12 w-full" />
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      )}
      {!isLoading && table.getRowModel().rows.length > 0 && (
        <Table
          aria-label={caption}
          className={cn(
            'w-full min-w-160 table-fixed text-[length:inherit] leading-[inherit] text-center',
            tableClassName,
          )}
        >
          <TableCaption className="sr-only mt-0">{caption}</TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow
                key={group.id}
                className="border-y bg-background text-sm text-muted-foreground hover:bg-background"
              >
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope="col"
                    colSpan={header.colSpan}
                    className={cn(
                      'h-auto px-5 py-3 font-medium whitespace-normal text-muted-foreground',
                      header.column.columnDef.meta?.headerClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="transition-none hover:bg-secondary/20"
              >
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="min-w-0 px-5 py-4 whitespace-normal"
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!isLoading && table.getRowModel().rows.length === 0 && (
        <div className="grid justify-items-center gap-3 border-t px-5 py-14 text-center">
          {emptyState}
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="mt-2 min-h-11"
              onClick={() => {
                const url = new URL(window.location.href);
                for (const name of Array.from(url.searchParams.keys())) {
                  if (name.startsWith('filter.')) url.searchParams.delete(name);
                }
                url.searchParams.delete('offset');
                if (url.href !== window.location.href)
                  window.history.pushState(
                    null,
                    '',
                    url.pathname + url.search + url.hash,
                  );
              }}
            >
              {t('clearFilters')}
            </Button>
          )}
        </div>
      )}
      <DataTablePagination table={table} pending={pending || isFetching} />
    </div>
  );
}
