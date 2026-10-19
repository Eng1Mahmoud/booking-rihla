'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { paymentOutcome } from '../payment-state';
import type { BookingPayment } from '../types';
export function PaymentStatus({ payment }: { payment: BookingPayment }) {
  const t = useTranslations('PaymentResult');
  const outcome = paymentOutcome(payment);
  return (
    <>
      <section
        className={'payment-outcome outcome-' + outcome}
        aria-live="polite"
        aria-atomic="true"
      >
        <h2>{t('outcomes.' + outcome + '.title')}</h2>
        <p>{t('outcomes.' + outcome + '.note')}</p>
        {payment.refundStatus && (
          <p>
            {t('refundState')}{' '}
            {t.has('refundStatuses.' + payment.refundStatus)
              ? t('refundStatuses.' + payment.refundStatus)
              : t('refundStatuses.REVIEW')}
          </p>
        )}
      </section>
      {outcome === 'paid' && (
        <Link
          href={'/bookings/' + payment.bookingId + '/ticket'}
          className="button-primary w-full mb-4"
        >
          {t('viewTicket')}
        </Link>
      )}
      {['expired', 'failed'].includes(outcome) && (
        <Link href="/" className="button-secondary w-full mb-4">
          {t('findTrip')}
        </Link>
      )}
    </>
  );
}
