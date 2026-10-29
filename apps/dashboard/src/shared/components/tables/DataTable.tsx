'use client';
import { useEffect, type ReactNode } from 'react';
import { useTable, type RowData } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import type { DataTableState } from '@/shared/hooks/useDataTableState';
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

export function DataTable<
  TData extends RowData,
  TFilters extends Record<string, string>,
>({
  state,
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
  onResetFilters,
  emptyState,
  beforeTable,
}: {
  state: DataTableState<TFilters>;
  columns: DataTableColumn<TData>[];
  data: TData[];
  rowCount?: number;
  tableClassName?: string;
  getRowId: (row: TData) => string;
  caption: string;
  search?: DataTableSearch;
  filters?: (state: DataTableState<TFilters>) => ReactNode;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onResetFilters?: () => void;
  emptyState?: ReactNode;
  beforeTable?: ReactNode;
}) {
  const t = useTranslations('DataTable');
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    manualPagination: true,
    rowCount: rowCount ?? 0,
    state: { pagination: state.pagination },
    onPaginationChange: state.setPagination,
  });
  const { pageIndex, pageSize } = state.pagination;
  const { setPagination } = state;
  useEffect(() => {
    if (rowCount === undefined || isFetching || isLoading || state.isSearching)
      return;
    const lastPage = Math.max(0, Math.ceil(rowCount / pageSize) - 1);
    if (pageIndex > lastPage)
      setPagination((current) => ({ ...current, pageIndex: lastPage }));
  }, [
    rowCount,
    isFetching,
    isLoading,
    state.isSearching,
    pageIndex,
    pageSize,
    setPagination,
  ]);
  const pending =
    isLoading ||
    state.isSearching ||
    rowCount === undefined ||
    (rowCount !== undefined &&
      rowCount > 0 &&
      pageIndex * pageSize >= rowCount);
  return (
    <div
      data-slot="data-table"
      className="min-w-0 overflow-hidden rounded-2xl border bg-card"
      aria-busy={isFetching || state.isSearching}
    >
      {(search || filters || onRefresh) && (
        <DataTableToolbar
          search={search}
          value={state.search}
          onSearchChange={state.setSearch}
          filters={filters?.(state)}
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
          {state.hasFilters && (
            <Button
              variant="outline"
              className="mt-2 min-h-11"
              onClick={onResetFilters ?? (() => state.resetFilters())}
            >
              {t('clearFilters')}
            </Button>
          )}
        </div>
      )}
      <DataTablePagination
        table={table}
        pending={pending || isFetching}
      />
    </div>
  );
}
