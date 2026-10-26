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
import { getPaymentAction } from '../actions/payment.actions';
export function PaymentDetails({
  id,
  onClose,
  onCloseAutoFocus,
}: {
  id: string;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const locale = useLocale(),
    t = useTranslations('Payments'),
    states = useTranslations('States');
  const query = useQuery({
    queryKey: ['payment', locale, id],
    queryFn: () => invokeAction(() => getPaymentAction(id)),
  });
  useActionErrors(query.error, {});
  const payment = query.data;
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
      {payment && (
        <>
          <RecordDetails
            items={[
              { label: t('reference'), value: <bdi>{payment.reference}</bdi> },
              { label: t('customer'), value: payment.customer.name },
              { label: t('email'), value: <bdi>{payment.customer.email}</bdi> },
              { label: t('status'), value: states(payment.paymentStatus) },
              {
                label: t('bookingStatus'),
                value: states(payment.bookingStatus),
              },
              {
                label: t('amount'),
                value: formatGrossPaid(String(payment.amountPiastres), locale),
              },
              {
                label: t('createdDate'),
                value: formatReportTime(payment.createdAt, locale),
              },
              {
                label: t('refund'),
                value: payment.refundStatus
                  ? states(payment.refundStatus)
                  : '—',
              },
              {
                label: t('intentionId'),
                value: payment.paymentSession?.intentionId,
              },
              { label: t('orderId'), value: payment.paymentSession?.orderId },
              {
                label: t('transactionId'),
                value: payment.settlement?.transactionId,
              },
              {
                label: t('sessionStatus'),
                value: payment.paymentSession
                  ? states(payment.paymentSession.status)
                  : '—',
              },
              {
                label: t('settlementStatus'),
                value: payment.settlement
                  ? states(payment.settlement.status)
                  : '—',
              },
              {
                label: t('verifiedAmount'),
                value: payment.settlement
                  ? formatGrossPaid(
                      String(payment.settlement.amountPiastres),
                      locale,
                    )
                  : '—',
              },
              {
                label: t('updated'),
                value: payment.settlement
                  ? formatReportTime(payment.settlement.updatedAt, locale)
                  : '—',
              },
            ]}
          />
          {payment.requiresReview && (
            <p className="mt-4 text-destructive">{t('requiresReview')}</p>
          )}
          <Link
            href={'/dashboard/bookings?bookingId=' + payment.bookingId}
            className="mt-5 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            {t('viewBooking')}
          </Link>
        </>
      )}
    </FormDialog>
  );
}
