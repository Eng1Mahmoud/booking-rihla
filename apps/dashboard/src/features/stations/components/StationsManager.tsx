'use client';
import { getCityOptionsAction } from '@/features/cities/actions/city.actions';
import { Link, useRouter } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useTransition } from 'react';
import { getStationsAction } from '../actions/station.actions';
import { useStationColumns } from '../hooks/useStationColumns';
import { type StationRow } from '../types/station';
import { StationCityFilter } from './StationCityFilter';
import { StationEditor } from './StationEditor';
const emptyRows: StationRow[] = [];
export function StationsManager({ cityId = '' }: { cityId?: string }) {
  const t = useTranslations('Stations');
  const locale = useLocale();
  const list = useDataTableState({ initialFilters: { cityId } });
  const client = useQueryClient();
  const cityOptions = queryOptions({
    queryKey: ['locations', locale, 'city-options'],
    queryFn: () => invokeAction(getCityOptionsAction),
  });

  const query = useQuery({
    queryKey: ['locations', locale, 'stations', list.params],
    queryFn: async () => {
      const [page, cities] = await Promise.all([
        invokeAction(() =>
          getStationsAction({
            search: list.params.search,
            limit: list.params.limit,
            offset: list.params.offset,
            cityId: list.params.filters.cityId || undefined,
          }),
        ),
        client.fetchQuery(cityOptions),
      ]);
      return { ...page, cities };
    },
  });
  const { columns, ...page } = useStationColumns();
  const router = useRouter();
  const [filterPending, startFilterTransition] = useTransition();
  const { setFilter } = list;
  useEffect(() => setFilter('cityId', cityId), [cityId, setFilter]);
  const cachedCities =
    query.data?.cities ?? client.getQueryData(cityOptions.queryKey);
  const collator = useMemo(() => new Intl.Collator(locale), [locale]);
  const cities = useMemo(
    () =>
      (cachedCities ?? []).toSorted((a, b) =>
        collator.compare(
          a[locale === 'ar' ? 'nameAr' : 'nameEn'],
          b[locale === 'ar' ? 'nameAr' : 'nameEn'],
        ),
      ),
    [cachedCities, collator, locale],
  );
  function changeCity(nextCityId: string) {
    list.setFilter('cityId', nextCityId);
    startFilterTransition(() =>
      router.replace(
        '/dashboard/stations' + (nextCityId ? '?cityId=' + nextCityId : ''),
        { scroll: false },
      ),
    );
  }
  function resetFilters() {
    list.resetFilters({ cityId: '' });
    if (list.filters.cityId || cityId) changeCity('');
  }
  async function refresh() {
    page.clearNotice();
    await client.invalidateQueries({
      queryKey: cityOptions.queryKey,
      refetchType: 'none',
    });
    return query.refetch();
  }

  return (
    <section aria-labelledby="catalog-title" aria-busy={filterPending}>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            id="catalog-title"
            className="text-[clamp(28px,2.6vw,38px)] leading-tight font-bold tracking-[-0.02em] text-balance"
          >
            {t('stationsTitle')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('stationsIntro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          className="min-h-12 shrink-0"
          disabled={!(query.data && cities.length)}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addStation')}
        </Button>
      </div>
      <div role="status" aria-live="polite" className="text-sm text-primary">
        {page.notice && <p className="mb-4">{page.notice}</p>}
      </div>
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(query.error, locale)}
          pending={query.isFetching}
          onRetry={refresh}
        />
      )}
      {(query.isPending || query.data) && (
        <DataTable
          state={list}
          columns={columns}
          data={query.data?.items ?? emptyRows}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('stationsTitle')}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          search={{
            label: t('searchStations'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={refresh}
          filters={(controls) => (
            <StationCityFilter
              cities={cities}
              value={controls.filters.cityId}
              onChange={changeCity}
              disabled={filterPending}
            />
          )}
          onResetFilters={resetFilters}
          beforeTable={
            query.data && !cities.length ? (
              <p className="mx-5 mb-5 rounded-[12px] bg-secondary p-4 text-sm">
                {t('needsCity')}{' '}
                <Link
                  href="/dashboard/cities"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {t('manageCities')}
                </Link>
              </p>
            ) : undefined
          }
          emptyState={
            <EmptyState
              icon={MapPin}
              title={t(list.hasFilters ? 'noResults' : 'noStations')}
              description={t(
                list.hasFilters ? 'noResultsHint' : 'noStationsHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && query.data && (
        <StationEditor
          {...page.editor}
          cities={cities}
          cityId={list.filters.cityId}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
      {page.confirmation.open && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('deleteStation')}
          description={t('deleteDescription', { name: page.confirmation.name })}
          confirmLabel={t('confirmDelete')}
          pendingLabel={t('deleting')}
          pending={page.confirmation.pending}
          error={page.confirmation.error}
          onConfirm={page.confirmation.onConfirm}
          onCancel={page.confirmation.onCancel}
          onCloseAutoFocus={page.focus.restore}
        >
          <p className="mt-3 text-sm text-muted-foreground">
            {t('stationDeleteHint')}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
