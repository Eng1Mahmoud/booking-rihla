'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useTicket } from '../hooks/useTicket';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import Image from 'next/image';
import type { TicketViewData } from '../types/ticket';
import { formatDate, formatTime, formatPrice } from '@/shared/lib/format';
import { Link } from '@/i18n/navigation';
export function TicketView({
  initial,
  userId,
}: {
  initial: TicketViewData;
  userId: string;
}) {
  const t = useTranslations('Ticket');
  const locale = useLocale() as 'ar' | 'en';
  const { user } = useAuth();
  const query = useTicket(initial, userId);
  if (user?.id !== userId) return null;
  // A failed refresh must not keep displaying an old usable ticket.
  if (query.isError)
    return (
      <div role="alert" className="notice">
        {errorMessage(query.error, locale)}{' '}
        <button
          type="button"
          className="text-button"
          onClick={() => void query.refetch()}
        >
          {t('refresh')}
        </button>
      </div>
    );
  const ticket = query.data;
  const bookingId = ticket.bookingId;
  const back = (
    <Link href={'/bookings/' + bookingId} className="text-button">
      {t('back')}
    </Link>
  );
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
