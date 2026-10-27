'use client';
import { MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { AssistantStation } from '../schemas/resultSchemas';

export function StationResultCard({
  station,
  locale,
  onNavigate,
}: {
  station: AssistantStation;
  locale: 'ar' | 'en';
  onNavigate: () => void;
}) {
  const isAr = locale === 'ar';
  const city = isAr ? station.cityNameAr : station.cityNameEn;
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <MapPin
          size={18}
          className="mt-0.5 shrink-0 text-primary"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground [overflow-wrap:anywhere]">
            {isAr ? station.nameAr : station.nameEn}
          </h3>
          {city && <p className="mt-1 text-xs text-muted-foreground">{city}</p>}
        </div>
      </div>
      <Link
        href={'/stations?cityId=' + station.cityId + '#station-' + station.id}
        onClick={onNavigate}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {isAr ? 'عرض المحطة في الدليل' : 'View station in directory'}
      </Link>
    </article>
  );
}
