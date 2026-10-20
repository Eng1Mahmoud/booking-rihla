'use client';
import { Button } from '@/shared/components/ui/button';
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
    <section
      className="rounded-2xl border bg-card mx-auto mt-6 mb-10 max-w-[620px] px-5 pt-8 pb-6 text-center md:mt-10 md:mb-16 md:px-8 md:pt-11 md:pb-7"
      aria-labelledby={titleId}
    >
      <div
        className="mx-auto mb-6 grid size-20 place-items-center rounded-full border border-sky-100 bg-sky-50 text-primary"
        aria-hidden="true"
      >
        <LoaderCircle
          size={36}
          className="animate-spin motion-reduce:animate-none"
        />
      </div>
      <div role="status" aria-live="polite">
        <h2
          className="text-[22px] font-semibold leading-relaxed md:text-[25px]"
          id={titleId}
        >
          {t('checkingTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-[380px] text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('checkingNote')}
        </p>
      </div>
      {reference && (
        <div className="mt-7 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 border-y py-4 text-sm">
          <span className="text-muted-foreground">{booking('reference')}</span>
          <bdi className="font-medium wrap-anywhere">{reference}</bdi>
        </div>
      )}
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {t('checkingSafety')}
      </p>
      {onRefresh && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Button
            size="lg"
            variant="outline"
            type="button"
            className="bg-card"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {booking('refresh')}
          </Button>
          <Button
            className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
            asChild
            variant="link"
          >
            <Link href="/bookings">{booking('myBookings')}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
