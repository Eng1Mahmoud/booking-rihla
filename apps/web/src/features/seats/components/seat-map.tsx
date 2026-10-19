'use client';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { Seat, SeatList } from '@/features/trips/types';
import { SeatIcon, SteeringWheel } from './seat-icon';
export function SeatMap({
  seats,
  selectedIds,
  layout,
  onToggle,
}: {
  seats: Seat[];
  selectedIds: string[];
  layout: SeatList['seatLayout'];
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('Seats');
  const physical = layout === 'STANDARD_2_2';
  const selected = new Set(selectedIds);
  return (
    <>
      <div className="seat-legend">
        <span>
          <i className="legend-box available" />
          {t('available')}
        </span>
        <span>
          <i className="legend-box selected" />
          {t('selected')}
        </span>
        <span>
          <i className="legend-box unavailable" />
          {t('unavailable')}
        </span>
      </div>
      <div className={physical ? 'bus-shell' : 'numbered-seats'} dir="ltr">
        {physical && (
          <div className="bus-front">
            <div className="driver">
              <SteeringWheel />
              <span>{t('driver')}</span>
            </div>
            <span className="bus-front-label">{t('front')}</span>
            <span className="bus-door">{t('door')}</span>
          </div>
        )}
        <div
          className={physical ? 'seat-grid' : 'seat-grid seat-grid-numbered'}
        >
          {seats.map((seat) => {
            const isSelected = selected.has(seat.id);
            const position = physical
              ? {
                  gridColumn: [1, 2, 4, 5][(seat.number - 1) % 4],
                  gridRow: Math.floor((seat.number - 1) / 4) + 1,
                }
              : undefined;
            return (
              <button
                key={seat.id}
                type="button"
                style={position}
                className={
                  'seat ' +
                  (isSelected
                    ? 'seat-selected'
                    : seat.isAvailable
                      ? 'seat-available'
                      : 'seat-unavailable')
                }
                disabled={!seat.isAvailable}
                aria-pressed={isSelected}
                aria-label={t('seatLabel', {
                  number: seat.number,
                  status: isSelected
                    ? t('selected')
                    : seat.isAvailable
                      ? t('available')
                      : t('unavailable'),
                })}
                onClick={() => onToggle(seat.id)}
              >
                <SeatIcon />
                <span>{seat.number}</span>
                {isSelected && <Check size={11} className="seat-check" />}
              </button>
            );
          })}
        </div>
        {physical && <div className="bus-rear" />}
      </div>
      <p className="seat-footnote">
        {physical ? t('layoutNote') : t('numberedOnly')}
      </p>
    </>
  );
}
