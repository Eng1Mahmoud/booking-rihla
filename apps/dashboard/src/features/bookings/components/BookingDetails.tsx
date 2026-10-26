'use client';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import { FormDialog } from '@/shared/components/dialogs/FormDialog';
import { RecordDetails } from '@/shared/components/feedback/RecordDetails';
import { ListError } from '@/shared/components/feedback/ListError';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';
import { getBookingAction } from '../actions/booking.actions';
export function BookingDetails({
  id,
  onClose,
  onCloseAutoFocus,
}: {
  id: string;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const locale = useLocale(),
    t = useTranslations('Bookings'),
    states = useTranslations('States');
  const query = useQuery({
    queryKey: ['booking', locale, id],
    queryFn: () => invokeAction(() => getBookingAction(id)),
  });
  useActionErrors(query.error, {});
  const booking = query.data;
  return (
    <FormDialog
      title={t('details')}
      description={t('detailsHint')}
      pending={false}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {query.isPending && <p role="status">{t('loading')}</p>}
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={t('readFailedHint')}
          pending={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {booking && (
        <>
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
          <h3 className="mt-5 text-lg font-semibold">{t('passengers')}</h3>
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
            href={'/dashboard/payments?bookingId=' + booking.id}
            className="mt-5 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            {t('viewPayments')}
          </Link>
        </>
      )}
    </FormDialog>
  );
}
