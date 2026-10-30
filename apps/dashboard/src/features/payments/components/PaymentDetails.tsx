'use client';
import { useQuery } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { getPaymentAction } from '../actions/payment.actions';
import { useSearchParams } from 'next/navigation';
import type { Payment } from '../schemas/paymentSchema';
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

export function PaymentDetails({ payment }: { payment: Payment }) {
  const urlParams = useSearchParams();
  const backHref = '/dashboard/payments?' + urlParams.toString();
  const locale = useLocale();
  const t = useTranslations('Payments');
  const states = useTranslations('States');

  return (
    <ContentPage
      title={t('details')}
      description={t('detailsHint')}
      backHref={backHref}
    >
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
            value: payment.refundStatus ? states(payment.refundStatus) : '—',
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
            value: payment.settlement ? states(payment.settlement.status) : '—',
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
        href={'/dashboard/bookings/' + encodeURIComponent(payment.bookingId)}
        className="mt-5 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
      >
        {t('viewBooking')}
      </Link>
    </ContentPage>
  );
}

export function PaymentDetailsPage({ id }: { id: string }) {
  const locale = useLocale();
  const t = useTranslations('Payments');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['payments', locale, 'detail', id],
    queryFn: () => invokeAction(() => getPaymentAction(id)),
  });
  if (!query.data || query.isError)
    return (
      <ContentPage
        title={t('details')}
        description={t('detailsHint')}
        backHref={'/dashboard/payments?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return <PaymentDetails payment={query.data} />;
}
