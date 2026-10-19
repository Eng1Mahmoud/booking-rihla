'use client';
import { useId } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function PaymentChecking({
  reference,
  onRefresh,
  refreshing = false,
}: {
  reference?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useTranslations('PaymentResult');
  const booking = useTranslations('Booking');
  const titleId = useId();
  return (
    <section className="panel payment-checking" aria-labelledby={titleId}>
      <div className="payment-checking-symbol" aria-hidden="true">
        <LoaderCircle size={36} className="payment-checking-spinner" />
      </div>
      <div role="status" aria-live="polite">
        <h2 id={titleId}>{t('checkingTitle')}</h2>
        <p className="payment-checking-description">{t('checkingNote')}</p>
      </div>
      {reference && (
        <div className="payment-checking-reference">
          <span>{booking('reference')}</span>
          <bdi>{reference}</bdi>
        </div>
      )}
      <p className="payment-checking-safety">{t('checkingSafety')}</p>
      {onRefresh && (
        <div className="payment-checking-actions">
          <button
            type="button"
            className="button-secondary"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {booking('refresh')}
          </button>
          <Link href="/bookings" className="text-button">
            {booking('myBookings')}
          </Link>
        </div>
      )}
    </section>
  );
}
