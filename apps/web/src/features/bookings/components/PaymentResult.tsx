import { Button } from '@/shared/components/ui/button';
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('title')}
        </h1>
      </div>
      <p className="text-muted-foreground mb-6">{t('note')}</p>
      {initial ? (
        <BookingDetail
          key={initial.booking.id}
          initial={initial}
          afterCheckout
        />
      ) : (
        <section className="rounded-2xl border bg-card grid justify-items-start gap-[18px] p-7">
          <p>{t('chooseBooking')}</p>
          <Button size="lg" asChild>
            <Link href="/bookings">{t('bookings')}</Link>
          </Button>
        </section>
      )}
    </>
  );
}
