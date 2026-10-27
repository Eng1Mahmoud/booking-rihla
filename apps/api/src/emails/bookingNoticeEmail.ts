import {
  bodyParagraph,
  infoCard,
  mutedParagraph,
  primaryNote,
  renderEmailShell,
} from './layout.ts';

type BookingNoticeData = {
  reference: string;
  language: string;
  purpose: 'TRIP_CANCELLED' | 'REFUND_SUCCEEDED';
  amountPiastres: string | null;
};

export function bookingNoticeEmail(message: BookingNoticeData) {
  const arabic = message.language === 'ar';
  const refunded = message.purpose === 'REFUND_SUCCEEDED';
  const piastres =
    message.amountPiastres === null ? null : BigInt(message.amountPiastres);
  const amount =
    piastres === null
      ? null
      : `${piastres / 100n}.${(piastres % 100n).toString().padStart(2, '0')}`;

  const subject = arabic
    ? refunded
      ? 'تم رد مبلغ الحجز — رحلة'
      : 'إلغاء الرحلة بواسطة الشركة — رحلة'
    : refunded
      ? 'Booking refund completed — Rihla'
      : 'Trip cancelled by the operator — Rihla';

  const text = arabic
    ? `رقم الحجز: ${message.reference}\n` +
      (refunded
        ? `تم رد ${amount} جنيه مصري. قد يستغرق ظهوره بعض الوقت حسب البنك.`
        : `ألغت الشركة رحلتك، والتذكرة لم تعد صالحة. ${amount ? 'تستحق استرداد كامل المبلغ المدفوع. تابع حالته في تفاصيل الحجز.' : 'لا يوجد مبلغ مستحق للاسترداد لهذا الحجز.'}`)
    : `Booking reference: ${message.reference}\n` +
      (refunded
        ? `A full refund of EGP ${amount} was verified. Bank posting times may vary.`
        : `The operator cancelled your trip. Your ticket is no longer valid. ${amount ? 'You are entitled to a full refund. Check its current status in your booking.' : 'No refund is due for this booking.'}`);

  const bodyHtml = refunded
    ? [
        bodyParagraph(
          arabic
            ? 'تم التحقق من رد المبلغ المرتبط بحجزك.'
            : 'The refund linked to your booking has been verified.',
        ),
        primaryNote(
          amount
            ? arabic
              ? `المبلغ: ${amount} جنيه مصري`
              : `Amount: EGP ${amount}`
            : arabic
              ? 'تم تأكيد عملية الاسترداد.'
              : 'The refund was confirmed.',
          'success',
        ),
        infoCard([
          {
            label: arabic ? 'مرجع الحجز' : 'Reference',
            value: message.reference,
          },
        ]),
        mutedParagraph(
          arabic
            ? 'قد يستغرق ظهور المبلغ في حسابك بعض الوقت حسب البنك أو وسيلة الدفع.'
            : 'Bank or payment provider posting times may vary before the amount appears.',
        ),
      ].join('')
    : [
        bodyParagraph(
          arabic
            ? 'ألغت الشركة رحلتك، لذلك لم تعد التذكرة صالحة للسفر.'
            : 'The operator cancelled your trip, so your ticket is no longer valid for travel.',
        ),
        primaryNote(
          amount
            ? arabic
              ? `تستحق استرداد ${amount} جنيه مصري. تابع الحالة من تفاصيل الحجز.`
              : `You are entitled to a full refund of EGP ${amount}. Track status in your booking details.`
            : arabic
              ? 'لا يوجد مبلغ مستحق للاسترداد لهذا الحجز.'
              : 'No refund is due for this booking.',
          amount ? 'warning' : 'neutral',
        ),
        infoCard([
          {
            label: arabic ? 'مرجع الحجز' : 'Reference',
            value: message.reference,
          },
        ]),
      ].join('');

  return {
    subject,
    text,
    html: renderEmailShell({
      language: message.language,
      title: arabic
        ? refunded
          ? 'تم رد المبلغ'
          : 'تم إلغاء الرحلة'
        : refunded
          ? 'Refund completed'
          : 'Trip cancelled',
      eyebrow: arabic ? 'إشعار الحجز' : 'Booking notice',
      preheader: text.slice(0, 120),
      bodyHtml,
    }),
  };
}
