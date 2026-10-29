'use client';
import { useId, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Search } from 'lucide-react';
import { Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/lib';

export type DataTableSearch = { label: string; placeholder: string };

export function DataTableToolbar({
  search,
  value,
  onSearchChange,
  filters,
  isFetching,
  onRefresh,
}: {
  search?: DataTableSearch;
  value: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  isFetching: boolean;
  onRefresh?: () => void;
}) {
  const id = useId();
  const t = useTranslations('DataTable');
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className={cn('grid gap-4', search && filters && 'sm:grid-cols-2')}>
        {search && (
          <div className="min-w-0">
            <label htmlFor={id} className="mb-2 block text-sm font-medium">
              {search.label}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 start-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={id}
                type="search"
                value={value}
                maxLength={200}
                placeholder={search.placeholder}
                className="h-12 bg-card ps-10"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>
        )}
        {filters}
      </div>
      {onRefresh && (
        <Button
          variant="outline"
          className="min-h-12"
          disabled={isFetching}
          aria-busy={isFetching}
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden="true" />
          {t(isFetching ? 'refreshing' : 'refresh')}
        </Button>
      )}
    </div>
  );
}
