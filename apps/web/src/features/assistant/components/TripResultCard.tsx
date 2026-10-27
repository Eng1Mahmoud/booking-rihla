'use client';

import { Link } from '@/i18n/navigation';
import { BusFront, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export type AssistantTrip = {
  id: string;
  departureAt: string;
  arrivalAt: string;
  priceEgp: number;
  originCity: string;
  originStation: string;
  destinationCity: string;
  destinationStation: string;
  busType: string | null;
  seatCount: number;
  tripPagePath: string;
};

function formatClock(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Cairo',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TripResultCard({
  trip,
  locale,
}: {
  trip: AssistantTrip;
  locale: 'ar' | 'en';
}) {
  const isAr = locale === 'ar';
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card text-sm shadow-sm">
      <div className="flex items-center gap-2 border-b bg-secondary/40 px-3 py-2">
        <BusFront size={18} className="text-primary" aria-hidden />
        <span className="font-medium">
          {trip.busType ?? (isAr ? 'حافلة' : 'Bus')}
        </span>
        <span className="ms-auto text-xs text-muted-foreground">
          {trip.seatCount} {isAr ? 'مقعد' : 'seats'}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3">
        <div className="min-w-0">
          <div className="font-semibold tabular-nums">
            {formatClock(trip.departureAt, locale)}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {trip.originStation || trip.originCity}
          </div>
        </div>
        <ArrowRight
          size={14}
          className="text-muted-foreground rtl:rotate-180"
        />
        <div className="min-w-0 text-end">
          <div className="font-semibold tabular-nums">
            {formatClock(trip.arrivalAt, locale)}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {trip.destinationStation || trip.destinationCity}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-dashed bg-secondary/20 px-3 py-2">
        <strong className="text-base">
          {trip.priceEgp.toLocaleString(isAr ? 'ar-EG' : 'en-EG')}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            {isAr ? 'ج.م' : 'EGP'}
          </span>
        </strong>
        <Button asChild size="sm" className="h-9">
          <Link href={trip.tripPagePath}>
            {isAr ? 'اختيار المقاعد' : 'Choose seats'}
          </Link>
        </Button>
      </div>
    </article>
  );
}
