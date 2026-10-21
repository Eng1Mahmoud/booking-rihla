import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { displayName, formatDate, formatTime } from '@/shared/lib/format';
import type { BookingDetails } from '../types/booking';
import { BookingPayment } from './BookingPayment';

export async function BookingDetail({
  initial,
  afterCheckout = false,
}: {
  initial: BookingDetails;
  afterCheckout?: boolean;
}) {
  const locale = (await getLocale()) as 'ar' | 'en';
  const t = await getTranslations('Booking');
  const booking = initial.booking;
  const Heading = afterCheckout ? 'h2' : 'h1';
  return (
    <BookingPayment initial={initial} afterCheckout={afterCheckout}>
      <section className="rounded-2xl border bg-card min-w-0 p-6 md:p-[30px]">
        <div className="mb-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{t('reference')}</span>
          <bdi className="font-semibold tracking-wide text-foreground wrap-anywhere">
            {booking.reference}
          </bdi>
        </div>
        <Heading className="text-2xl font-semibold md:text-[27px]">
          {displayName(booking.trip.route.originStation.city, locale)} —{' '}
          {displayName(booking.trip.route.destinationStation.city, locale)}
        </Heading>
        <p className="text-muted-foreground mt-3">
          {formatDate(booking.trip.departureAt, locale)}
        </p>
        <div className="mt-7 flex items-center justify-between gap-3 border-y py-6 md:gap-5">
          <div className="grid min-w-0 gap-1.5">
            <strong className="text-xl font-semibold md:text-[22px]">
              {formatTime(booking.trip.departureAt, locale)}
            </strong>
            <span className="text-xs text-muted-foreground">
              {displayName(booking.trip.route.originStation, locale)}
            </span>
          </div>
          <ArrowRight
            size={24}
            className="shrink-0 text-slate-400 rtl:rotate-180"
          />
          <div className="grid min-w-0 gap-1.5">
            <strong className="text-xl font-semibold md:text-[22px]">
              {formatTime(booking.trip.arrivalAt, locale)}
            </strong>
            <span className="text-xs text-muted-foreground">
              {displayName(booking.trip.route.destinationStation, locale)}
            </span>
          </div>
        </div>
        <h2 className="mt-7 text-lg font-semibold">{t('passengers')}</h2>
        <div className="mt-4 grid gap-2">
          {booking.passengers?.map((person) => (
            <div
              className="flex justify-between gap-3 border-b py-2.5 text-sm"
              key={person.seatId}
            >
              <span>{person.name}</span>
              <strong className="font-medium">
                {t('seat', { number: person.seatNumber })}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          {t('contact')} <bdi>{booking.contactPhone}</bdi>
        </p>
        <p className="mt-5 text-sm text-muted-foreground">
          {t('noCancellation')}
        </p>
      </section>
    </BookingPayment>
  );
}
