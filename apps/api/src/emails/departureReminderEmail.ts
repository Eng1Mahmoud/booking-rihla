import type { TicketDetails } from '../services/ticketService.ts';
import {
  appPath,
  bodyParagraph,
  infoCard,
  mutedParagraph,
  primaryNote,
  renderEmailShell,
} from './layout.ts';

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

  const passengers = ticket.passengers
    .map((p) => (ar ? 'المقعد ' : 'Seat ') + p.seatNumber + ': ' + p.name)
    .join(' · ');

  const text = [
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
  ].join('\n');

  const bodyHtml = [
    bodyParagraph(
      ar
        ? 'تذكير ودي: رحلتك خلال الـ 24 ساعة القادمة. راجع التفاصيل واستعد في الوقت المناسب.'
        : 'Friendly reminder: your trip departs within the next 24 hours. Review the details and arrive on time.',
    ),
    primaryNote((ar ? 'المغادرة: ' : 'Departure: ') + departure, 'warning'),
    infoCard([
      {
        label: ar ? 'مرجع الحجز' : 'Reference',
        value: ticket.reference,
      },
      {
        label: ar ? 'من' : 'From',
        value: station(ticket.trip.origin),
      },
      {
        label: ar ? 'إلى' : 'To',
        value: station(ticket.trip.destination),
      },
      {
        label: ar ? 'الركاب' : 'Passengers',
        value: passengers,
      },
    ]),
    mutedParagraph(
      ar
        ? 'التوقيت بتوقيت القاهرة. احتفظ بتذكرتك ومرجع الحجز معك.'
        : 'Times are in Africa/Cairo. Keep your ticket and booking reference handy.',
    ),
  ].join('');

  const bookingsUrl = appPath(language, '/bookings');

  return {
    subject:
      (ar ? 'تذكير بموعد رحلتك: ' : 'Your upcoming trip: ') + ticket.reference,
    text,
    html: renderEmailShell({
      language,
      title: ar ? 'تذكير بالرحلة' : 'Trip reminder',
      eyebrow: ar ? 'خلال 24 ساعة' : 'Within 24 hours',
      preheader: (ar ? 'مغادرة ' : 'Departs ') + departure,
      bodyHtml,
      cta: bookingsUrl
        ? {
            label: ar ? 'فتح التذكرة' : 'Open ticket',
            href: bookingsUrl,
          }
        : undefined,
    }),
  };
}
