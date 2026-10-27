import type { TicketData } from '../services/ticketService.ts';
import {
  bodyParagraph,
  infoCard,
  mutedParagraph,
  primaryNote,
  renderEmailShell,
} from './layout.ts';

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

  const passengers = ticket.passengers
    .map((p) => (ar ? 'المقعد ' : 'Seat ') + p.seatNumber + ': ' + p.name)
    .join(ar ? ' · ' : ' · ');

  const text = [
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
  ].join('\n');

  const bodyHtml = [
    bodyParagraph(
      ar
        ? 'تم تأكيد حجزك وتحصيل المبلغ بنجاح. تفاصيل رحلتك أدناه.'
        : 'Your booking is confirmed and payment was collected. Trip details are below.',
    ),
    primaryNote(
      (ar ? 'مرجع الحجز: ' : 'Booking reference: ') + ticket.reference,
      'success',
    ),
    infoCard([
      {
        label: ar ? 'من' : 'From',
        value: station(ticket.trip.origin),
      },
      {
        label: ar ? 'إلى' : 'To',
        value: station(ticket.trip.destination),
      },
      {
        label: ar ? 'المغادرة' : 'Departure',
        value: date(ticket.trip.departureAt),
      },
      {
        label: ar ? 'الوصول' : 'Arrival',
        value: date(ticket.trip.arrivalAt),
      },
      {
        label: ar ? 'الركاب' : 'Passengers',
        value: passengers,
      },
      {
        label: ar ? 'الإجمالي' : 'Total',
        value: (ticket.totalPiastres / 100).toFixed(2) + ' EGP',
      },
    ]),
    mutedParagraph(
      ar
        ? 'التوقيت بتوقيت القاهرة. رمز QR للتذكرة مرفق — احتفظ به ومرجع الحجز للرحلة.'
        : 'Times are in Africa/Cairo. Your ticket QR is attached — keep it and your booking reference for the trip.',
    ),
  ].join('');

  return {
    subject:
      (ar ? 'تذكرة حجزك المؤكد: ' : 'Your confirmed booking ticket: ') +
      ticket.reference,
    text,
    html: renderEmailShell({
      language,
      title: ar ? 'تذكرتك جاهزة' : 'Your ticket is ready',
      eyebrow: ar ? 'حجز مؤكد' : 'Confirmed booking',
      preheader:
        (ar ? 'مرجع الحجز ' : 'Booking ') +
        ticket.reference +
        (ar ? ' — تم التأكيد' : ' — confirmed'),
      bodyHtml,
    }),
    attachments: [
      {
        filename: 'ticket-' + ticket.reference + '.png',
        content: Buffer.from(ticket.qr.imageDataUrl.split(',')[1]!, 'base64'),
        contentType: 'image/png',
      },
    ],
  };
}
