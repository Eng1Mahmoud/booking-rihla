'use client';
import { useTranslations } from 'next-intl';
import { Check, DoorOpen, Toilet } from 'lucide-react';
import { useId } from 'react';
import { seatPosition } from '../seat-layout';
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
  const centerFacilities =
    physical &&
    seats.length === 44 &&
    new Set(seats.map((seat) => seat.number)).size === 44 &&
    seats.every(
      (seat) =>
        Number.isInteger(seat.number) && seat.number >= 1 && seat.number <= 44,
    );
  const descriptionId = useId();
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
            <span className="bus-door">
              <DoorOpen size={16} aria-hidden="true" />
              {t('frontDoor')}
            </span>
          </div>
        )}
        <div
          className={physical ? 'seat-grid' : 'seat-grid seat-grid-numbered'}
        >
          {centerFacilities && (
            <>
              <div
                className="bus-facility bus-wc"
                style={{ gridColumn: '4 / span 2', gridRow: 5 }}
              >
                <Toilet size={23} aria-hidden="true" />
                <span>{t('toilet')}</span>
              </div>
              <div
                className="bus-facility bus-middle-door"
                style={{ gridColumn: '4 / span 2', gridRow: 6 }}
              >
                <DoorOpen size={23} aria-hidden="true" />
                <span>{t('middleDoor')}</span>
              </div>
            </>
          )}
          {seats.map((seat) => {
            const isSelected = selected.has(seat.id);
            const position = physical
              ? seatPosition(seat.number, centerFacilities)
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
                aria-describedby={descriptionId}
                aria-label={
                  t('seatLabel', {
                    number: seat.number,
                    status: isSelected
                      ? t('selected')
                      : seat.isAvailable
                        ? t('available')
                        : t('unavailable'),
                  }) +
                  (centerFacilities && seat.number >= 17 && seat.number <= 20
                    ? ', ' + t(seat.number <= 18 ? 'wcRow' : 'middleDoorRow')
                    : '')
                }
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
      <p className="seat-footnote" id={descriptionId}>
        {physical
          ? t(centerFacilities ? 'facilitiesLayoutNote' : 'layoutNote')
          : t('numberedOnly')}
      </p>
    </>
  );
}
