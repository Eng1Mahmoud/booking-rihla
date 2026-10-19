'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useSession } from '@/providers/session-provider';
import { BrowserApiError, errorMessage } from '@/lib/browser-api';
import { formatDate, formatTime, formatPrice } from '@/features/trips/format';
import { Link } from '@/i18n/navigation';
import type { Ticket } from '../types';
export function TicketView({ bookingId }: { bookingId: string }) {
  const t = useTranslations('Ticket');
  const locale = useLocale() as 'ar' | 'en';
  const { user, status, request } = useSession();
  const query = useQuery({
    queryKey: ['owned-ticket', user?.id, bookingId],
    enabled: status === 'signed-in',
    queryFn: async ({ signal }) =>
      (
        await request<{ data: Ticket }>('bookings/' + bookingId + '/ticket', {
          signal,
        })
      ).data,
    retry: false,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: 'always',
  });
  const back = (
    <Link href={'/bookings/' + bookingId} className="text-button">
      {t('back')}
    </Link>
  );
  if (status === 'loading')
    return <p className="loading-state">{t('loading')}</p>;
  if (status === 'guest') return null;
  if (query.isPending) return <p className="loading-state">{t('loading')}</p>;
  if (query.isError) {
    const unavailable =
      query.error instanceof BrowserApiError &&
      query.error.code === 'TICKET_NOT_FOUND';
    return (
      <section className="panel result-entry" role="alert">
        <h1>{unavailable ? t('unavailable') : t('error')}</h1>
        <p>
          {unavailable
            ? t('unavailableNote')
            : errorMessage(query.error, locale)}
        </p>
        <button
          type="button"
          className="button-secondary"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {t('refresh')}
        </button>
        {back}
      </section>
    );
  }
  const ticket = query.data;
  const { origin, destination } = ticket.trip;
  const name = (station: typeof origin) =>
    locale === 'ar' ? station.nameAr : station.nameEn;
  const city = (station: typeof origin) =>
    locale === 'ar' ? station.cityAr : station.cityEn;
  const qrImage = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
    ticket.qr.imageDataUrl,
  )
    ? ticket.qr.imageDataUrl
    : null;
  return (
    <>
      <div className="section-heading">
        <h1>{t('title')}</h1>
        {back}
      </div>
      <article className="panel ticket-layout" aria-label={t('title')}>
        <section>
          <p className="pill">{t('confirmed')}</p>
          <h2 className="ticket-route">
            {city(origin)} — {city(destination)}
          </h2>
          <dl className="ticket-facts">
            <div>
              <dt>{t('reference')}</dt>
              <dd>
                <bdi>{ticket.reference}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('departure')}</dt>
              <dd>
                {name(origin)}
                <br />
                {formatDate(ticket.trip.departureAt, locale)} —{' '}
                <bdi>{formatTime(ticket.trip.departureAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('arrival')}</dt>
              <dd>
                {name(destination)}
                <br />
                {formatDate(ticket.trip.arrivalAt, locale)} —{' '}
                <bdi>{formatTime(ticket.trip.arrivalAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('issued')}</dt>
              <dd>
                {formatDate(ticket.issuedAt, locale)} —{' '}
                <bdi>{formatTime(ticket.issuedAt, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('total')}</dt>
              <dd>{formatPrice(ticket.totalPiastres, locale)}</dd>
            </div>
          </dl>
          <h3 className="mt-6">{t('passengers')}</h3>
          <ul className="passenger-list">
            {ticket.passengers.map((person) => (
              <li key={person.seatNumber}>
                <span>{person.name}</span>
                <strong>{t('seat', { number: person.seatNumber })}</strong>
              </li>
            ))}
          </ul>
          <p className="muted text-sm mt-5">{t('timeZone')}</p>
        </section>
        <aside className="ticket-qr">
          {qrImage ? (
            <Image
              unoptimized
              src={qrImage}
              width={256}
              height={256}
              alt={t('qrAlt')}
            />
          ) : (
            <p role="alert">{t('qrError')}</p>
          )}
          <p>{t('qrNote')}</p>
          <button
            type="button"
            className="button-secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {t('refresh')}
          </button>
        </aside>
      </article>
    </>
  );
}
