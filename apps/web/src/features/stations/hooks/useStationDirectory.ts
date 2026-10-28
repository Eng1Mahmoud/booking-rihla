import { useState } from 'react';
import { useTripCatalog } from '@/features/trips/hooks/useTrips';
import type { City, Station, TripCatalog } from '@/features/trips/types/trip';
import { displayName } from '@/shared/lib/format';

export type StationGroupData = {
  id: string;
  city?: City;
  stations: Station[];
};

export function useStationDirectory({
  initial,
  initialCityId,
  locale,
}: {
  initial?: TripCatalog;
  initialCityId: string;
  locale: 'ar' | 'en';
}) {
  const query = useTripCatalog(initial);
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState(initialCityId);
  const catalog = query.data;
  const cityMap = new Map(catalog?.cities.map((city) => [city.id, city]));
  const name = (item: { nameAr: string; nameEn: string }) =>
    displayName(item, locale);
  const grouped = new Map<string, Station[]>();

  for (const station of catalog?.stations ?? []) {
    const city = cityMap.get(station.cityId);
    if (cityId && cityId !== station.cityId) continue;
    if (
      search &&
      ![station.nameAr, station.nameEn, city?.nameAr, city?.nameEn]
        .join(' ')
        .includes(search)
    )
      continue;
    const group = grouped.get(station.cityId) ?? [];
    group.push(station);
    grouped.set(station.cityId, group);
  }

  const collator = new Intl.Collator(locale);
  const stationCityIds = new Set(
    catalog?.stations.map((station) => station.cityId),
  );
  const cities = (catalog?.cities ?? [])
    .filter((city) => stationCityIds.has(city.id) || city.id === cityId)
    .sort((a, b) => collator.compare(name(a), name(b)));
  const groups: StationGroupData[] = [...grouped.entries()]
    .map(([id, stations]) => ({ id, city: cityMap.get(id), stations }))
    .sort((a, b) =>
      collator.compare(a.city ? name(a.city) : '', b.city ? name(b.city) : ''),
    );
  const count = groups.reduce(
    (total, group) => total + group.stations.length,
    0,
  );

  function clear() {
    setSearch('');
    setCityId('');
  }

  return {
    query,
    catalog,
    search,
    setSearch,
    cityId,
    setCityId,
    cities,
    groups,
    count,
    clear,
  };
}
