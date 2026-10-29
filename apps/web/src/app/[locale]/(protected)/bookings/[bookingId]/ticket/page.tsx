import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { TicketView } from '@/features/tickets/components/TicketView';
import { getTicketAction } from '@/features/tickets/actions/tickets.actions';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import {
  getApiDataOrThrow,
  ApiError,
  errorMessage,
} from '@/shared/lib/apiResult';
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
    const user = await getSignedInUser();
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
    const data = getApiDataOrThrow(await getTicketAction(bookingId));
    ticket = {
      ticket: data,
      userId: user.id,
      readAt: Date.now(),
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
      notFound();
    const t = await getTranslations('Ticket');
    const unavailable =
      error instanceof ApiError && error.code === 'TICKET_NOT_FOUND';
    return (
      <div
        data-ticket-page
        className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16 print:w-full print:max-w-none print:p-0"
      >
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
    <div
      data-ticket-page
      className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16 print:w-full print:max-w-none print:p-0"
    >
      <TicketView
        key={ticket.userId + ':' + bookingId}
        initial={ticket.ticket}
        userId={ticket.userId}
        readAt={ticket.readAt}
      />
    </div>
  );
}
