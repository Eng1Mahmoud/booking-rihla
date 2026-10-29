'use client';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { paymentOutcome } from '../lib/paymentState';
import type { BookingPaymentData } from '../types/booking';

const outcomeBorder: Record<string, string> = {
  paid: 'border-emerald-600',
  processing: 'border-sky-500',
  waiting: 'border-amber-500',
  failed: 'border-destructive',
  expired: 'border-destructive',
  cancelled: 'border-destructive',
  review: 'border-amber-500',
  refundRequired: 'border-amber-500',
  refunded: 'border-muted-foreground',
};

export function PaymentStatus({ payment }: { payment: BookingPaymentData }) {
  const t = useTranslations('PaymentResult');
  const outcome = paymentOutcome(payment);
  return (
    <>
      <section
        className={cn(
          'mb-5 border-s-[3px] ps-3.5',
          outcomeBorder[outcome] ?? 'border-border',
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <h2 className="text-lg leading-relaxed">
          {t('outcomes.' + outcome + '.title')}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t('outcomes.' + outcome + '.note')}
        </p>
        {payment.refundStatus && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t('refundState')}{' '}
            {t.has('refundStatuses.' + payment.refundStatus)
              ? t('refundStatuses.' + payment.refundStatus)
              : t('refundStatuses.REVIEW')}
          </p>
        )}
      </section>
      {outcome === 'paid' && (
        <Button size="lg" className="mb-4 w-full" asChild>
          <Link href={'/bookings/' + payment.bookingId + '/ticket'}>
            {t('viewTicket')}
          </Link>
        </Button>
      )}
      {['expired', 'failed', 'cancelled'].includes(outcome) && (
        <Button
          size="lg"
          className="mb-4 w-full bg-card"
          asChild
          variant="outline"
        >
          <Link href="/">{t('findTrip')}</Link>
        </Button>
      )}
    </>
  );
}
