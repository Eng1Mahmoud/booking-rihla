'use client';
import { Button } from '@/shared/components/ui/button';
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
  const qrImage = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
    ticket.qr.imageDataUrl,
  )
    ? ticket.qr.imageDataUrl
    : null;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('title')}
        </h1>
        {back}
      </div>
      <article
        className="rounded-2xl border bg-card grid min-w-0 gap-8 p-[22px] md:grid-cols-[minmax(0,1fr)_280px] md:p-8"
        aria-label={t('title')}
      >
        <section>
          <p className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-primary">
            {t('confirmed')}
          </p>
          <h2 className="my-5 text-[22px] font-semibold md:text-[26px]">
            {city(origin)} — {city(destination)}
          </h2>
          <dl className="grid gap-5">
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
                className="flex flex-wrap justify-between gap-3 border-b py-3"
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
        <aside className="self-start border-t pt-5 text-center md:border-t-0 md:pt-0">
          {qrImage ? (
            <Image
              className="mx-auto block h-auto max-w-full"
              unoptimized
              src={qrImage}
              width={256}
              height={256}
              alt={t('qrAlt')}
            />
          ) : (
            <p
              className="my-[18px] text-sm leading-relaxed text-muted-foreground"
              role="alert"
            >
              {t('qrError')}
            </p>
          )}
          <p className="my-[18px] text-sm leading-relaxed text-muted-foreground">
            {t('qrNote')}
          </p>
          <Button
            size="lg"
            variant="outline"
            type="button"
            className="bg-card"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {t('refresh')}
          </Button>
        </aside>
      </article>
    </>
  );
}
