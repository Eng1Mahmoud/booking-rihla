'use client';
import type { RowData } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { DataTableInstance } from '@/shared/lib/dataTable';

export function DataTablePagination<TData extends RowData>({
  table,
  pending = false,
}: {
  table: DataTableInstance<TData>;
  pending?: boolean;
}) {
  const t = useTranslations('DataTable');
  const { pageIndex, pageSize } = table.state.pagination;
  const count = table.getRowCount();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {pending
          ? t('loading')
          : t('range', {
              from: count ? pageIndex * pageSize + 1 : 0,
              to: Math.min((pageIndex + 1) * pageSize, count),
              count,
            })}
      </p>
      <nav className="flex gap-2" aria-label={t('pagination')}>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending || !table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
          {t('previous')}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={pending || !table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          {t('next')}
          <ChevronRight className="rtl:rotate-180" aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
