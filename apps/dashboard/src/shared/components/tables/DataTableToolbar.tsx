'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';

export type DataTableSearch = { label: string; placeholder: string };

export function DataTableToolbar({
  search,
  filters,
  isFetching,
  onRefresh,
}: {
  search?: DataTableSearch;
  filters?: ReactNode;
  isFetching: boolean;
  onRefresh?: () => void;
}) {
  const urlParams = useSearchParams();
  const urlQuery = urlParams.toString();
  const searchText = urlParams.get('filter.search') ?? '';
  const [value, setValue] = useState(searchText);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setValue(searchText);
    return () => clearTimeout(timer.current);
  }, [searchText, urlQuery]);
  function onSearchChange(value: string) {
    setValue(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      const searchText = value.trim();
      if (searchText) url.searchParams.set('filter.search', searchText);
      else url.searchParams.delete('filter.search');
      url.searchParams.delete('offset');
      if (url.href !== window.location.href)
        window.history.replaceState(
          null,
          '',
          url.pathname + url.search + url.hash,
        );
    }, 300);
  }
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
