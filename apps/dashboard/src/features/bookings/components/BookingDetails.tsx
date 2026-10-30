'use client';
import { useQuery } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { getBookingAction } from '../actions/booking.actions';
import { useSearchParams } from 'next/navigation';
import type { BookingDetail } from '../schemas/bookingSchema';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ContentPage,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { RecordDetails } from '@/shared/components/feedback/RecordDetails';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';

export function BookingDetails({ booking }: { booking: BookingDetail }) {
  const urlParams = useSearchParams();
  const backHref = '/dashboard/bookings?' + urlParams.toString();
  const locale = useLocale();
  const t = useTranslations('Bookings');
  const states = useTranslations('States');

  return (
    <ContentPage
      title={t('details')}
      description={t('detailsHint')}
      backHref={backHref}
    >
      <RecordDetails
        items={[
          { label: t('reference'), value: <bdi>{booking.reference}</bdi> },
          { label: t('status'), value: states(booking.status) },
          { label: t('customer'), value: booking.customer.name },
          { label: t('email'), value: <bdi>{booking.customer.email}</bdi> },
          { label: t('phone'), value: <bdi>{booking.contactPhone}</bdi> },
          {
            label: t('departure'),
            value: formatReportTime(booking.trip.departureAt, locale),
          },
          {
            label: t('total'),
            value: formatGrossPaid(String(booking.totalPiastres), locale),
          },
          {
            label: t('expires'),
            value: booking.expiresAt
              ? formatReportTime(booking.expiresAt, locale)
              : '—',
          },
          {
            label: t('refund'),
            value: booking.refund
              ? states(booking.refund.status) +
                ' · ' +
                formatGrossPaid(booking.refund.amountPiastres, locale)
              : '—',
          },
        ]}
      />
      <h2 className="mt-5 text-lg font-semibold">{t('passengers')}</h2>
      <ul className="mt-3 grid gap-2">
        {booking.passengers.map((passenger) => (
          <li
            key={passenger.seatId}
            className="flex flex-wrap justify-between gap-3 border-b pb-2"
          >
            <span>{passenger.name}</span>
            <span>{t('seat', { number: passenger.seatNumber })}</span>
          </li>
        ))}
      </ul>
      <Link
        href={'/dashboard/payments?filter.bookingId=' + booking.id}
        className="mt-5 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
      >
        {t('viewPayments')}
      </Link>
    </ContentPage>
  );
}

export function BookingDetailsPage({ id }: { id: string }) {
  const locale = useLocale();
  const t = useTranslations('Bookings');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['bookings', locale, 'detail', id],
    queryFn: () => invokeAction(() => getBookingAction(id)),
  });
  if (!query.data || query.isError)
    return (
      <ContentPage
        title={t('details')}
        description={t('detailsHint')}
        backHref={'/dashboard/bookings?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return <BookingDetails booking={query.data} />;
}
