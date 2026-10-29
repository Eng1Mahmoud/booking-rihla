'use client';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRightLeft,
  Search as SearchIcon,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Form } from '@/shared/components/forms/Form';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import { DatePickr } from '@/shared/components/forms/DatePickr';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import {
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { Button } from '@/shared/components/ui/button';
import type { City, Station } from '../types/trip';
import type { Search } from '../schemas/searchSchema';
import {
  searchFormSchema,
  type SearchFormValues,
} from '../schemas/searchFormSchema';
export function TripSearchForm({
  cities,
  stations,
  today,
  defaults = {},
}: {
  cities: City[];
  stations: Station[];
  today: string;
  defaults?: Partial<Search>;
}) {
  const locale = useLocale(),
    t = useTranslations('Search'),
    router = useRouter();
  const name = (city: City) => (locale === 'ar' ? city.nameAr : city.nameEn);
  const options = (
    <>
      <NativeSelectOption value="" disabled>
        {t('choose')}
      </NativeSelectOption>
      {cities.map((city) => (
        <NativeSelectOptGroup key={city.id} label={name(city)}>
          <NativeSelectOption value={'city:' + city.id}>
            {name(city)} — {t('allStations')}
          </NativeSelectOption>
          {stations
            .filter((station) => station.cityId === city.id)
            .map((station) => (
              <NativeSelectOption
                key={station.id}
                value={'station:' + station.id}
              >
                {name(station)}، {name(city)}
              </NativeSelectOption>
            ))}
        </NativeSelectOptGroup>
      ))}
    </>
  );
  return (
    <Form
      schema={searchFormSchema(today)}
      defaultValues={{
        origin: defaults.originStationId
          ? 'station:' + defaults.originStationId
          : defaults.originCityId
            ? 'city:' + defaults.originCityId
            : '',
        destination: defaults.destinationStationId
          ? 'station:' + defaults.destinationStationId
          : defaults.destinationCityId
            ? 'city:' + defaults.destinationCityId
            : '',
        date: defaults.travelDate ?? today,
      }}
      onSubmit={(values) => {
        const [from, fromId] = values.origin.split(':'),
          [to, toId] = values.destination.split(':');
        router.push(
          '/trips?' +
            new URLSearchParams({
              [from === 'city' ? 'originCityId' : 'originStationId']: fromId!,
              [to === 'city' ? 'destinationCityId' : 'destinationStationId']:
                toId!,
              travelDate: values.date,
            }),
        );
      }}
      className="grid-cols-[minmax(0,1fr)_44px] items-start gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:grid-cols-[1fr_auto_1fr_1fr_auto]"
    >
      {(form) => (
        <>
          <FormSelect<SearchFormValues>
            name="origin"
            label={
              <>
                <MapPin size={16} />
                {t('from')}
              </>
            }
          >
            {options}
          </FormSelect>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="row-span-2 mx-auto mt-8 size-11 self-center rounded-full sm:row-span-1 sm:self-start"
            aria-label={t('swap')}
            onClick={() => {
              const { origin, destination } = form.getValues();
              form.setValue('origin', destination, { shouldValidate: false });
              form.setValue('destination', origin, { shouldValidate: false });
            }}
          >
            <ArrowRightLeft
              size={19}
              aria-hidden="true"
              className="rotate-90 sm:rotate-0"
            />
          </Button>
          <div className="min-w-0">
            <FormSelect<SearchFormValues>
              name="destination"
              label={
                <>
                  <MapPin size={16} />
                  {t('to')}
                </>
              }
            >
              {options}
            </FormSelect>
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-3 md:col-span-2 lg:col-span-1">
            <DatePickr<SearchFormValues>
              name="date"
              label={
                <>
                  <CalendarDays size={16} />
                  {t('date')}
                </>
              }
              min={today}
            />
          </div>
          <div className="col-span-2 self-start sm:col-span-3 md:col-span-1 md:mt-8">
            <SubmitButton>
              <SearchIcon size={19} />
              {t('search')}
            </SubmitButton>
          </div>
        </>
      )}
    </Form>
  );
}
