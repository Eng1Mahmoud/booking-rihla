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
  if (arabic)
    return {
      subject: refunded ? 'تم رد مبلغ الحجز' : 'إلغاء الرحلة بواسطة الشركة',
      text:
        `رقم الحجز: ${message.reference}\n` +
        (refunded
          ? `تم رد ${amount} جنيه مصري. قد يستغرق ظهوره بعض الوقت حسب البنك.`
          : `ألغت الشركة رحلتك، والتذكرة لم تعد صالحة. ${amount ? 'تستحق استرداد كامل المبلغ المدفوع. تابع حالته في تفاصيل الحجز.' : 'لا يوجد مبلغ مستحق للاسترداد لهذا الحجز.'}`),
    };
  return {
    subject: refunded
      ? 'Booking refund completed'
      : 'Trip cancelled by the operator',
    text:
      `Booking reference: ${message.reference}\n` +
      (refunded
        ? `A full refund of EGP ${amount} was verified. Bank posting times may vary.`
        : `The operator cancelled your trip. Your ticket is no longer valid. ${amount ? 'You are entitled to a full refund. Check its current status in your booking.' : 'No refund is due for this booking.'}`),
  };
}
