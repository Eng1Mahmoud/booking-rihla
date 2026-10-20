import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { TicketView } from '@/features/tickets/components/TicketView';
import { getTicket } from '@/features/tickets/lib/tickets.server';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { Link } from '@/i18n/navigation';
import { ReadError } from '@/shared/components/ReadError';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bookingId,
    )
  )
    notFound();
  let ticket;
  try {
    ticket = await getTicket(bookingId);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
      notFound();
    const t = await getTranslations('Ticket');
    const unavailable =
      error instanceof ApiError && error.code === 'TICKET_NOT_FOUND';
    return (
      <div className="container-shell page-space">
        <ReadError
          autoRefresh
          title={unavailable ? t('unavailable') : t('error')}
          message={
            unavailable
              ? t('unavailableNote')
              : errorMessage(error, await getLocale())
          }
        >
          <Link href={'/bookings/' + bookingId} className="text-button">
            {t('back')}
          </Link>
        </ReadError>
      </div>
    );
  }
  return (
    <div className="container-shell page-space">
      <TicketView initial={ticket.ticket} userId={ticket.userId} />
    </div>
  );
}
