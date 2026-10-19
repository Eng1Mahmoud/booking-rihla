'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BookingDetail } from './booking-detail';
export function PaymentResult({ bookingId }: { bookingId?: string }) {
  const t = useTranslations('PaymentResult');
  return (
    <>
      <div className="section-heading">
        <h1>{t('title')}</h1>
      </div>
      <p className="muted mb-6">{t('note')}</p>
      {bookingId ? (
        <BookingDetail key={bookingId} bookingId={bookingId} afterCheckout />
      ) : (
        <section className="panel result-entry">
          <p>{t('chooseBooking')}</p>
          <Link href="/bookings" className="button-primary">
            {t('bookings')}
          </Link>
        </section>
      )}
    </>
  );
}
