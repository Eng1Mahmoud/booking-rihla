'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Armchair, Check, CircleGauge } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const seats = Array.from({ length: 12 }, (_, index) => index + 1);
const unavailable = [3, 8];

export function SeatPreview() {
  const t = useTranslations('Home');
  const format = useFormatter();
  const [selected, setSelected] = useState(5);
  return (
    <div className="overflow-hidden rounded-[2rem] bg-secondary-foreground p-5 text-white sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {t('seatPreviewTitle')}
          </h3>
          <p className="mt-1 text-sm text-white/75">{t('seatPreviewIntro')}</p>
        </div>
        <Armchair
          size={27}
          className="shrink-0 text-white/75"
          aria-hidden="true"
        />
      </div>
      <div
        className="mx-auto mt-6 max-w-[300px] rounded-t-[3.5rem] rounded-b-2xl border border-white/25 bg-white/5 px-3 pt-6 pb-5 sm:px-5"
        dir="ltr"
      >
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/20 pb-4 text-xs text-white/75">
          <CircleGauge size={24} aria-hidden="true" />
          <span>{t('busFront')}</span>
        </div>
        <div
          className="grid grid-cols-[1fr_1fr_20px_1fr_1fr] gap-x-1.5 gap-y-3"
          role="group"
          aria-label={t('seatPreviewTitle')}
        >
          {seats.map((seat, index) => (
            <button
              key={seat}
              type="button"
              disabled={unavailable.includes(seat)}
              aria-pressed={selected === seat}
              aria-label={t(
                unavailable.includes(seat)
                  ? 'previewUnavailable'
                  : 'previewSeat',
                { number: seat },
              )}
              onClick={() => setSelected(seat)}
              style={{ gridColumn: (index % 4) + (index % 4 > 1 ? 2 : 1) }}
              className={cn(
                'home-preview-seat relative flex min-h-11 min-w-0 items-center justify-center rounded-t-lg rounded-b-sm border-2 border-white/60 border-b-4 text-sm font-medium hover:bg-white/15 disabled:border-white/15 disabled:bg-white/10 disabled:text-white/40 disabled:opacity-100',
                selected === seat &&
                  'border-white bg-white text-secondary-foreground hover:bg-white',
              )}
            >
              <span
                key={selected === seat ? 'selected' : 'available'}
                className={selected === seat ? 'home-seat-selected' : ''}
              >
                {format.number(seat)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/80">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm border border-white/70" />
          {t('previewAvailableLegend')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-white" />
          {t('previewSelectedLegend')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-white/20" />
          {t('previewUnavailableLegend')}
        </span>
      </div>
      <p
        className="mt-5 flex min-h-7 items-center justify-center gap-2 text-sm font-medium"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Check size={17} aria-hidden="true" />
        {t('previewSelection', { number: selected })}
      </p>
      <p className="mt-2 text-center text-xs leading-6 text-white/70">
        {t('previewNote')}
      </p>
    </div>
  );
}
