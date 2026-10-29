import { z } from 'zod';
import { notFound } from 'next/navigation';
import { Button } from '@/shared/components/ui';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BookingDetail, getBookingDetails } from '@/features/bookings/server';
import { ApiError, errorMessage } from '@/shared/lib';
import { ReadError } from '@/shared/components/feedback/ReadError';

export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bookingId } = await searchParams;
  if (
    bookingId !== undefined &&
    (typeof bookingId !== 'string' || !z.uuid().safeParse(bookingId).success)
  )
    notFound();
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
  // Provider query flags never determine payment status.
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
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
    </div>
  );
}
