import type { TicketDetails } from '../services/ticketService.ts';
export function departureReminderEmail(
  ticket: TicketDetails,
  language: string,
) {
  const ar = language === 'ar';
  const departure = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(ticket.trip.departureAt));
  const station = (value: TicketDetails['trip']['origin']) =>
    ar
      ? value.cityAr + ' - ' + value.nameAr
      : value.cityEn + ' - ' + value.nameEn;
  return {
    subject:
      (ar ? 'تذكير بموعد رحلتك: ' : 'Your upcoming trip: ') + ticket.reference,
    text: [
      ar
        ? 'تذكير: رحلتك خلال الساعات الـ24 القادمة.'
        : 'Reminder: your trip departs within the next 24 hours.',
      (ar ? 'مرجع الحجز: ' : 'Booking reference: ') + ticket.reference,
      (ar ? 'من: ' : 'From: ') + station(ticket.trip.origin),
      (ar ? 'إلى: ' : 'To: ') + station(ticket.trip.destination),
      (ar ? 'المغادرة: ' : 'Departure: ') + departure,
      ar ? 'التوقيت المحلي للقاهرة' : 'Times are in Africa/Cairo',
      ...ticket.passengers.map(
        (p) => (ar ? 'المقعد ' : 'Seat ') + p.seatNumber + ': ' + p.name,
      ),
      ar
        ? 'احتفظ بتذكرتك ومرجع الحجز للرحلة.'
        : 'Keep your ticket and booking reference for the journey.',
    ].join('\n'),
  };
}
