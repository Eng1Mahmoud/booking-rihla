'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useTicket } from '../hooks/useTicket';
import Image from 'next/image';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ApiError, errorMessage } from '@/shared/lib/apiClient';
import { formatDate, formatTime, formatPrice } from '@/shared/lib/format';
import { Link } from '@/i18n/navigation';
export function TicketView({ bookingId }: { bookingId: string }) {
  const t = useTranslations('Ticket');
  const locale = useLocale() as 'ar' | 'en';
  const { user, status } = useAuth();
  const query = useTicket(user?.id, bookingId);
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
      query.error instanceof ApiError &&
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
