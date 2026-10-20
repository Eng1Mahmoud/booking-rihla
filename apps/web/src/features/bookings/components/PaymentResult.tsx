import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { BookingDetail } from './BookingDetail';
import { getBookingDetails } from '../lib/bookings.server';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { ReadError } from '@/shared/components/feedback/ReadError';
export async function PaymentResult({ bookingId }: { bookingId?: string }) {
  const t = await getTranslations('PaymentResult');
  let initial;
  if (bookingId) {
    try {
      initial = await getBookingDetails(bookingId);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
        notFound();
      return <ReadError message={errorMessage(error, await getLocale())} />;
    }
  }
  return (
    <>
      <div className="section-heading">
        <h1>{t('title')}</h1>
      </div>
      <p className="muted mb-6">{t('note')}</p>
      {initial ? (
        <BookingDetail
          key={initial.booking.id}
          initial={initial}
          afterCheckout
        />
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
