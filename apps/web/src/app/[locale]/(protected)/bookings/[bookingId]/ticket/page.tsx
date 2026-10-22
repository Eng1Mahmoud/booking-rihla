import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { TicketView } from '@/features/tickets/components/TicketView';
import { requireCurrentUser, readApi } from '@/features/auth/lib/auth.server';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Ticket } from '@/features/tickets/types/ticket';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { Link } from '@/i18n/navigation';
import { ReadError } from '@/shared/components/feedback/ReadError';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) notFound();
  let ticket;
  try {
    const user = await requireCurrentUser();
    const { qr, ...data } = unwrapApiResult(
      await readApi<Ticket>('bookings/' + bookingId + '/ticket'),
    );
    ticket = {
      ticket: { ...data, qr: { imageDataUrl: qr.imageDataUrl } },
      userId: user.id,
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
      notFound();
    const t = await getTranslations('Ticket');
    const unavailable =
      error instanceof ApiError && error.code === 'TICKET_NOT_FOUND';
    return (
      <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
        <ReadError
          autoRefresh
          title={unavailable ? t('unavailable') : t('error')}
          message={
            unavailable
              ? t('unavailableNote')
              : errorMessage(error, await getLocale())
          }
        >
          <Button
            className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
            asChild
            variant="link"
          >
            <Link href={'/bookings/' + bookingId}>{t('back')}</Link>
          </Button>
        </ReadError>
      </div>
    );
  }
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <TicketView initial={ticket.ticket} userId={ticket.userId} />
    </div>
  );
}
