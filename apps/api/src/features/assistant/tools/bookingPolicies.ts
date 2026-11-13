/** Public booking policy text used by getBookingInfo. Keep in sync with product rules. */

export const BOOKING_POLICIES = {
  how_to_book: {
    summaryAr:
      'ابحث عن رحلة، اختر المقاعد، أكمل الدفع خلال مهلة الحجز (حتى ١٠ دقائق). التذكرة تصل بعد تأكيد الدفع.',
    summaryEn:
      'Search for a trip, choose seats, and complete payment within the hold window (up to 10 minutes). Your ticket is issued after payment is confirmed.',
  },
  cancellation: {
    summaryAr:
      'الركاب لا يمكنهم إلغاء الحجز بأنفسهم من التطبيق. إلغاء الرحلة من الشركة يتطلب معالجة الاسترداد وفق السياسة المعتمدة.',
    summaryEn:
      'Passengers cannot cancel bookings themselves in the app. Company-initiated trip cancellation requires refund handling under the approved policy.',
  },
  payment: {
    summaryAr:
      'الدفع يتم عبر بوابة الدفع المتاحة في المنصة. لا تُعتبر إعادة التوجيه للمتصفح دليلاً على إتمام الدفع؛ التأكيد يأتي من إشعار الدفع.',
    summaryEn:
      'Payment is completed through the platform checkout. A browser redirect alone is not proof of payment; confirmation comes from the payment notification.',
  },
  refund: {
    summaryAr:
      'الاسترداد يُعالج وفق سياسة الشركة والحالة المالية للحجز. الاستفسارات تُراجع من خلال الدعم أو لوحة الإدارة المعتمدة.',
    summaryEn:
      'Refunds follow company policy and the booking payment state. Inquiries are handled through support or the authorized admin flow.',
  },
  hold_time: {
    summaryAr:
      'حجز المقاعد يُحتفظ به حتى عشر دقائق من وقت الإنشاء. بعد انتهاء المهلة تُحرر المقاعد إن لم يكتمل الدفع.',
    summaryEn:
      'Seat holds last up to ten minutes from creation. After expiry, seats are released if payment was not completed.',
  },
  general: {
    summaryAr:
      'رحلة تساعدك في البحث عن رحلات الحافلات وحجز المقاعد والدفع. استخدم البحث أو المساعد لاختيار المدينة والتاريخ ثم أكمل الحجز من صفحة الرحلة.',
    summaryEn:
      'Rihla helps you search bus trips, reserve seats, and pay. Use search or the assistant to pick city and date, then complete booking from the trip page.',
  },
} as const;
