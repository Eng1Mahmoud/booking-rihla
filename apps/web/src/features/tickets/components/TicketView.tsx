'use client';
import { Button } from '@/shared/components/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useTicket } from '../hooks/useTicket';
import {
  errorMessage,
  formatDate,
  formatTime,
  formatPrice,
} from '@/shared/lib';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import type { TicketViewData } from '../types/ticket';
import { Link } from '@/i18n/navigation';
export function TicketView({
  initial,
  userId,
  readAt,
}: {
  initial: TicketViewData;
  userId: string;
  readAt: number;
}) {
  const t = useTranslations('Ticket');
  const locale = useLocale() as 'ar' | 'en';
  const query = useTicket(initial, userId, readAt);
  if (query.user?.id !== userId) return null;
  // A failed refresh must not keep displaying an old usable ticket.
  if (query.isError)
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
      >
        {errorMessage(query.error, locale)}{' '}
        <Button
          variant="link"
          type="button"
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          onClick={() => void query.refetch()}
        >
          {t('refresh')}
        </Button>
      </div>
    );
  const ticket = query.data;
  const bookingId = ticket.bookingId;
  const back = (
    <Button
      className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
      asChild
      variant="link"
    >
      <Link href={'/bookings/' + bookingId}>{t('back')}</Link>
    </Button>
  );
  const { origin, destination } = ticket.trip;
  const name = (station: typeof origin) =>
    locale === 'ar' ? station.nameAr : station.nameEn;
  const city = (station: typeof origin) =>
    locale === 'ar' ? station.cityAr : station.cityEn;
  const validQr = (image: string) =>
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image);
  const allQrReady =
    ticket.passengers.length > 0 &&
    ticket.passengers.every((person) => validQr(person.qr.imageDataUrl));
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5 print:hidden">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('title')}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {back}
          <Button
            type="button"
            disabled={query.isFetching || query.busy || !allQrReady}
            onClick={() => void query.printTicket()}
          >
            <Printer size={18} aria-hidden="true" />
            {t(query.busy ? 'preparingPrint' : 'print')}
          </Button>
        </div>
      </div>
      <p
        className="mb-5 text-sm text-muted-foreground print:hidden"
        role="status"
      >
        {t('printNote')}
      </p>
      {query.printStatus === 'error' && (
        <p role="alert" className="mb-5 text-sm text-destructive print:hidden">
          {t('printError')}
        </p>
      )}
      {!query.printReady && (
        <p className="hidden print:block">{t('printFromButton')}</p>
      )}
      <article
        ref={query.ticketRef}
        data-print-ready={query.printReady}
        className="rounded-2xl border bg-card grid min-w-0 gap-8 p-[22px] md:grid-cols-[minmax(0,1fr)_280px] md:p-8 print:hidden print:rounded-none print:border-0 print:p-0 print:text-[14px] print:gap-6 data-[print-ready=true]:print:block"
        aria-label={t('title')}
      >
        <div className="hidden print:col-span-full print:flex print:items-center print:justify-between print:border-b print:pb-3">
          <strong className="text-2xl" dir="ltr">
            Rihla.
          </strong>
          <span>{t('title')}</span>
        </div>
        <section className="min-w-0">
          <p className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-primary print:border print:bg-white print:text-black">
            {t('confirmed')}
          </p>
          <h2 className="my-5 text-[22px] font-semibold md:text-[26px]">
            {city(origin)} — {city(destination)}
          </h2>
          <dl className="grid gap-5 print:gap-3">
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">
                {t('reference')}
              </dt>
              <dd className="m-0 leading-relaxed wrap-anywhere">
                <bdi>{ticket.reference}</bdi>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">
                {t('departure')}
              </dt>
              <dd className="m-0 leading-relaxed wrap-anywhere">
                {name(origin)}
                <br />
                {formatDate(ticket.trip.departureAt, locale)} —{' '}
                <bdi>{formatTime(ticket.trip.departureAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">
                {t('arrival')}
              </dt>
              <dd className="m-0 leading-relaxed wrap-anywhere">
                {name(destination)}
                <br />
                {formatDate(ticket.trip.arrivalAt, locale)} —{' '}
                <bdi>{formatTime(ticket.trip.arrivalAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">
                {t('issued')}
              </dt>
              <dd className="m-0 leading-relaxed wrap-anywhere">
                {formatDate(ticket.issuedAt, locale)} —{' '}
                <bdi>{formatTime(ticket.issuedAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-sm text-muted-foreground">
                {t('total')}
              </dt>
              <dd className="m-0 leading-relaxed wrap-anywhere">
                {formatPrice(ticket.totalPiastres, locale)}
              </dd>
            </div>
          </dl>
          <h3 className="mt-6">{t('passengers')}</h3>
          <ul className="mt-4 grid list-none gap-2 p-0">
            {ticket.passengers.map((person) => (
              <li
                className="flex flex-wrap justify-between gap-3 border-b py-3 print:break-inside-avoid print:py-2"
                key={person.seatNumber}
              >
                <span>{person.name}</span>
                <strong className="font-medium">
                  {t('seat', { number: person.seatNumber })}
                </strong>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm mt-5">{t('timeZone')}</p>
        </section>
        <aside className="self-start border-t pt-5 text-center md:border-t-0 md:pt-0 print:mt-6 print:border-0 print:pt-0">
          <div className="grid gap-5 print:grid-cols-2 print:gap-4">
            {ticket.passengers.map((person) => (
              <figure
                key={person.seatId}
                className="m-0 rounded-xl border p-4 print:break-inside-avoid print:text-black"
              >
                <figcaption className="mb-3 grid gap-1 text-sm">
                  <strong className="wrap-anywhere">{person.name}</strong>
                  <span>{t('seat', { number: person.seatNumber })}</span>
                </figcaption>
                {validQr(person.qr.imageDataUrl) ? (
                  <Image
                    data-passenger-qr
                    className="mx-auto block h-auto max-w-full print:w-[45mm]"
                    unoptimized
                    loading="eager"
                    src={person.qr.imageDataUrl}
                    width={256}
                    height={256}
                    alt={t('passengerQrAlt', {
                      name: person.name,
                      number: person.seatNumber,
                    })}
                  />
                ) : (
                  <p role="alert" className="text-sm text-destructive">
                    {t('qrError')}
                  </p>
                )}
              </figure>
            ))}
          </div>
          <p className="my-[18px] text-sm leading-relaxed text-muted-foreground">
            {t('qrNote')}
          </p>
          <Button
            size="lg"
            variant="outline"
            type="button"
            className="bg-card print:hidden"
            disabled={query.isFetching || query.busy}
            onClick={() => void query.refetch()}
          >
            {t('refresh')}
          </Button>
        </aside>
      </article>
    </>
  );
}
