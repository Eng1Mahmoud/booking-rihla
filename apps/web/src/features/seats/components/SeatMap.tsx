'use client';
import { useTranslations } from 'next-intl';
import { Check, DoorOpen, Toilet } from 'lucide-react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib';
import { seatPosition } from '../lib/seatLayout';
import type { Seat, SeatList } from '@/features/trips';
import { SeatIcon, SteeringWheel } from './SeatIcon';

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
  const mapLabelId = useId();
  const selected = new Set(selectedIds);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function focusSeat(id: string) {
    buttonRefs.current.get(id)?.focus();
  }

  function onSeatKeyDown(event: KeyboardEvent<HTMLButtonElement>, seat: Seat) {
    const step =
      event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowLeft'
          ? -1
          : event.key === 'ArrowDown'
            ? 4
            : event.key === 'ArrowUp'
              ? -4
              : 0;
    if (!step) return;
    event.preventDefault();
    const targetNumber = seat.number + step;
    const next = seats.find(
      (item) =>
        item.number === targetNumber &&
        (item.isAvailable || selected.has(item.id)),
    );
    if (next) focusSeat(next.id);
  }

  return (
    <>
      <div className="my-[22px] flex flex-wrap justify-center gap-[18px] text-xs text-muted-foreground md:mt-7 md:gap-6">
        <span className="flex items-center gap-2">
          <i className="block size-[15px] rounded border border-[#afc7d9] bg-card" />
          {t('available')}
        </span>
        <span className="flex items-center gap-2">
          <i className="block size-[15px] rounded border border-primary bg-primary" />
          {t('selected')}
        </span>
        <span className="flex items-center gap-2">
          <i className="block size-[15px] rounded border border-[#d2dce5] bg-[#e5eaf0]" />
          {t('unavailable')}
        </span>
      </div>
      <div
        className={cn(
          'mx-auto w-full max-w-[340px]',
          physical
            ? 'relative max-w-[316px] rounded-[42px_42px_26px_26px] border-2 border-[#cbd9e3] bg-[#fafcfe] px-[17px] pt-[18px] pb-3 md:max-w-[340px] md:px-[22px] md:pt-5 md:pb-3.5'
            : 'my-6',
        )}
        dir="ltr"
        role="group"
        aria-labelledby={mapLabelId}
        aria-describedby={descriptionId}
      >
        <span id={mapLabelId} className="sr-only">
          {t('title')}
        </span>
        {physical && (
          <div className="relative mb-5 flex h-[110px] items-start justify-between gap-2.5 rounded-t-[28px] border-t-4 border-[#dce8ef] px-[3px] pt-2">
            <div className="flex w-full items-start justify-between">
              <div className="flex min-w-16 flex-col items-center gap-1">
                <SteeringWheel className="size-[35px] text-[#7b91a4]" />
                <span className="block text-center text-[9px] text-[#8498aa]">
                  {t('driver')}
                </span>
              </div>
              {centerFacilities && (
                <div className="flex min-w-16 flex-col items-center gap-1">
                  <SteeringWheel className="size-[35px] text-[#7b91a4]" />
                  <span className="block text-center text-[9px] text-[#8498aa]">
                    {t('secondDriver')}
                  </span>
                </div>
              )}
            </div>
            <span className="absolute top-[66px] left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap text-[#8498aa]">
              {t('front')}
            </span>
            <span className="absolute right-0 bottom-0 flex flex-col items-center gap-[3px] border border-e-0 border-[#cad8e2] px-1.5 py-0.5 text-[9px] text-[#8498aa]">
              <DoorOpen size={16} aria-hidden="true" />
              {t('frontDoor')}
            </span>
          </div>
        )}
        <div
          className={cn(
            'grid gap-x-[7px] gap-y-[9px] md:gap-x-2',
            physical
              ? 'grid-cols-[1fr_1fr_24px_1fr_1fr] md:grid-cols-[1fr_1fr_30px_1fr_1fr]'
              : 'grid-cols-4',
          )}
        >
          {centerFacilities && (
            <>
              <div className="col-span-2 col-start-4 row-start-5 flex h-[61px] min-w-0 flex-col items-center justify-center gap-[5px] rounded-md border border-[#d1dde7] bg-[#eef3f7] text-center text-[10px] text-[#526b7e] md:h-16 md:text-[11px]">
                <Toilet size={23} aria-hidden="true" />
                <span>{t('toilet')}</span>
              </div>
              <div className="relative col-span-2 col-start-4 row-start-6 flex h-[61px] min-w-0 flex-col items-center justify-center gap-[5px] border-y-2 border-[#c4d3df] text-center text-[10px] text-[#526b7e] after:absolute after:inset-y-2 after:right-0 after:w-2 after:border-x after:border-[#c4d3df] after:content-[''] md:h-16 md:text-[11px]">
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
                ref={(node) => {
                  if (node) buttonRefs.current.set(seat.id, node);
                  else buttonRefs.current.delete(seat.id);
                }}
                style={position}
                className={cn(
                  'relative flex h-[61px] min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[9px] border transition-colors duration-150 md:h-16',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-[0_2px_0_#045d88]'
                    : seat.isAvailable
                      ? 'border-[#b9cedd] bg-card text-[#4b7c9d] shadow-[0_2px_0_#e7eff5] hover:border-primary hover:bg-accent hover:text-primary'
                      : 'cursor-not-allowed border-[#e0e7ed] bg-[#edf1f5] text-[#a3b0bc] disabled:opacity-100',
                )}
                disabled={!seat.isAvailable}
                aria-pressed={isSelected}
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
                onKeyDown={(event) => onSeatKeyDown(event, seat)}
              >
                <SeatIcon className="size-[30px] md:size-[33px]" />
                <span
                  className={cn(
                    'text-[11px] font-medium leading-tight',
                    !seat.isAvailable && 'line-through',
                  )}
                >
                  {seat.number}
                </span>
                {isSelected && (
                  <Check size={11} className="absolute top-[3px] right-[3px]" />
                )}
              </button>
            );
          })}
        </div>
        {physical && (
          <div className="mt-[23px] h-1.5 rounded-lg bg-[#e5edf3]" />
        )}
      </div>
      <p
        className="mt-5 text-center text-xs text-muted-foreground"
        id={descriptionId}
      >
        {physical
          ? t(centerFacilities ? 'facilitiesLayoutNote' : 'layoutNote')
          : t('numberedOnly')}
      </p>
    </>
  );
}
