import type { TicketData } from '../services/ticketService.ts';
export function ticketEmail(ticket: TicketData, language: string) {
  const ar = language === 'ar';
  const date = (iso: string) =>
    new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(iso));
  const station = (value: TicketData['trip']['origin']) =>
    ar
      ? value.cityAr + ' - ' + value.nameAr
      : value.cityEn + ' - ' + value.nameEn;
  return {
    subject:
      (ar ? 'تذكرة حجزك المؤكد: ' : 'Your confirmed booking ticket: ') +
      ticket.reference,
    text: [
      ar
        ? 'تم تأكيد حجزك وتحصيل المبلغ.'
        : 'Your booking is confirmed and payment has been collected.',
      (ar ? 'مرجع الحجز: ' : 'Booking reference: ') + ticket.reference,
      (ar ? 'من: ' : 'From: ') + station(ticket.trip.origin),
      (ar ? 'إلى: ' : 'To: ') + station(ticket.trip.destination),
      (ar ? 'المغادرة: ' : 'Departure: ') + date(ticket.trip.departureAt),
      (ar ? 'الوصول: ' : 'Arrival: ') + date(ticket.trip.arrivalAt),
      ar ? 'التوقيت المحلي للقاهرة' : 'Times are in Africa/Cairo',
      ...ticket.passengers.map(
        (p) => (ar ? 'المقعد ' : 'Seat ') + p.seatNumber + ': ' + p.name,
      ),
      (ar ? 'الإجمالي: ' : 'Total: ') +
        (ticket.totalPiastres / 100).toFixed(2) +
        ' EGP',
      ar
        ? 'رمز QR للتذكرة مرفق بالرسالة. احتفظ بمرجع الحجز.'
        : 'Your ticket QR is attached. Keep your booking reference.',
    ].join('\n'),
    attachments: [
      {
        filename: 'ticket-' + ticket.reference + '.png',
        content: Buffer.from(ticket.qr.imageDataUrl.split(',')[1]!, 'base64'),
        contentType: 'image/png',
      },
    ],
  };
}
