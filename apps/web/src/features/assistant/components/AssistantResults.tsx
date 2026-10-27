'use client';
import { Link } from '@/i18n/navigation';
import { TripResultCard } from './TripResultCard';
import { StationResultCard } from './StationResultCard';
import { AssistantSuggestions } from './AssistantSuggestions';
import {
  assistantTripSchema,
  assistantStationSchema,
  assistantCitySchema,
  assistantSearchSchema,
  type AssistantTrip,
  type AssistantStation,
  type AssistantSearch,
} from '../schemas/resultSchemas';

export function AssistantResults({
  parts,
  locale,
  pending,
  showSuggestions,
  onSend,
  onDetails,
  onNavigate,
}: {
  parts: unknown[];
  locale: 'ar' | 'en';
  pending: boolean;
  showSuggestions: boolean;
  onSend: (text: string) => Promise<void>;
  onDetails: (tripId: string) => void;
  onNavigate: () => void;
}) {
  const trips = new Map<string, AssistantTrip>();
  const stations = new Map<string, AssistantStation>();
  const cities = new Map<
    string,
    { id: string; nameAr: string; nameEn: string }
  >();
  let search: AssistantSearch | undefined;
  for (const part of parts) {
    if (!part || typeof part !== 'object' || !('output' in part)) continue;
    const output = part.output;
    if (!output || typeof output !== 'object') continue;
    const tripCandidates =
      'trips' in output && Array.isArray(output.trips)
        ? output.trips
        : 'trip' in output
          ? [output.trip]
          : [];
    for (const candidate of tripCandidates.slice(0, 20)) {
      const parsed = assistantTripSchema.safeParse(candidate);
      if (parsed.success) trips.set(parsed.data.id, parsed.data);
    }
    if ('stations' in output && Array.isArray(output.stations))
      for (const candidate of output.stations.slice(0, 20)) {
        const parsed = assistantStationSchema.safeParse(candidate);
        if (parsed.success) stations.set(parsed.data.id, parsed.data);
      }
    if ('cities' in output && Array.isArray(output.cities))
      for (const candidate of output.cities.slice(0, 20)) {
        const parsed = assistantCitySchema.safeParse(candidate);
        if (parsed.success) cities.set(parsed.data.id, parsed.data);
      }
    if ('search' in output) {
      const parsed = assistantSearchSchema.safeParse(output.search);
      if (parsed.success) search = parsed.data;
    }
  }
  if (!trips.size && !stations.size && !cities.size && !search) return null;
  const isAr = locale === 'ar';
  return (
    <div className="w-full max-w-[95%] space-y-2">
      {[...trips.values()].map((trip) => (
        <TripResultCard
          key={trip.id}
          trip={trip}
          locale={locale}
          pending={pending}
          onDetails={onDetails}
        />
      ))}
      {[...stations.values()].map((station) => (
        <StationResultCard
          key={station.id}
          station={station}
          locale={locale}
          onNavigate={onNavigate}
        />
      ))}
      {cities.size > 0 && (
        <ul
          aria-label={isAr ? 'المدن' : 'Cities'}
          className="flex flex-wrap gap-2"
        >
          {[...cities.values()].map((city) => (
            <li key={city.id} className="min-w-0 max-w-full">
              <Link
                href={'/stations?cityId=' + city.id + '#city-' + city.id}
                onClick={onNavigate}
                className="inline-flex min-h-11 max-w-full items-center rounded-xl border border-border bg-card px-3 py-2 text-sm text-primary [overflow-wrap:anywhere] hover:bg-accent"
              >
                {isAr ? city.nameAr : city.nameEn}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(stations.size > 0 || cities.size > 0) && (
        <Link
          href="/stations"
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline"
        >
          {isAr ? 'كل المدن والمحطات' : 'All cities and stations'}
        </Link>
      )}
      {search && showSuggestions && (
        <AssistantSuggestions
          search={search}
          locale={locale}
          pending={pending}
          onSend={onSend}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
