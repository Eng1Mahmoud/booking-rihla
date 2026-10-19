'use client';
import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRightLeft,
  Search as SearchIcon,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { City, Station } from '@/features/trips/api/trips.server';
import type { Search } from '@/features/trips/schemas/searchSchema';
import { isCalendarDate } from '@/features/trips/schemas/searchSchema';
type Props = {
  cities: City[];
  stations: Station[];
  today: string;
  defaults?: Partial<Search>;
};
export function TripSearchForm({
  cities,
  stations,
  today,
  defaults = {},
}: Props) {
  const locale = useLocale();
  const t = useTranslations('Search');
  const router = useRouter();
  const [origin, setOrigin] = useState(
    defaults.originStationId
      ? 'station:' + defaults.originStationId
      : defaults.originCityId
        ? 'city:' + defaults.originCityId
        : '',
  );
  const [destination, setDestination] = useState(
    defaults.destinationStationId
      ? 'station:' + defaults.destinationStationId
      : defaults.destinationCityId
        ? 'city:' + defaults.destinationCityId
        : '',
  );
  const [date, setDate] = useState(defaults.travelDate ?? today);
  const [error, setError] = useState('');
  const name = (item: City) => (locale === 'ar' ? item.nameAr : item.nameEn);
  function options() {
    return (
      <>
        <option value="" disabled>
          {t('choose')}
        </option>
        {cities.map((city) => (
          <optgroup key={city.id} label={name(city)}>
            <option value={'city:' + city.id}>
              {name(city)} — {t('allStations')}
            </option>
            {stations
              .filter((station) => station.cityId === city.id)
              .map((station) => (
                <option key={station.id} value={'station:' + station.id}>
                  {name(station)}، {name(city)}
                </option>
              ))}
          </optgroup>
        ))}
      </>
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (
      !origin ||
      !destination ||
      origin === destination ||
      !isCalendarDate(date)
    ) {
      setError(t('invalid'));
      return;
    }
    const [originKind, originId] = origin.split(':');
    const [destinationKind, destinationId] = destination.split(':');
    const query = new URLSearchParams({
      [originKind === 'city' ? 'originCityId' : 'originStationId']: originId!,
      [destinationKind === 'city'
        ? 'destinationCityId'
        : 'destinationStationId']: destinationId!,
      travelDate: date,
    });
    router.push('/trips?' + query);
  }
  return (
    <div>
      <form className="search-form" onSubmit={submit}>
        <label className="field search-field">
          <span>
            <MapPin size={16} />
            {t('from')}
          </span>
          <select
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            required
          >
            {options()}
          </select>
        </label>
        <button
          type="button"
          className="search-swap icon-button"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
          aria-label={t('swap')}
        >
          <ArrowRightLeft size={19} />
        </button>
        <label className="field search-field">
          <span>
            <MapPin size={16} />
            {t('to')}
          </span>
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            required
          >
            {options()}
          </select>
        </label>
        <label className="field search-field">
          <span>
            <CalendarDays size={16} />
            {t('date')}
          </span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="button-primary">
          <SearchIcon size={19} />
          {t('search')}
        </button>
      </form>
      {error && (
        <p role="alert" className="notice mt-4">
          {error}
        </p>
      )}
    </div>
  );
}
