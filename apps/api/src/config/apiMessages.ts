// Public messages are selected by stable code, never from exception text.
export const apiMessages: Record<string, { ar: string; en: string }> = {
  ACCOUNT_NOT_READY: {
    ar: 'الحساب غير جاهز لتسجيل الدخول.',
    en: 'An account must be active and email-verified before receiving an administrator role',
  },
  ADMINISTRATOR_NOT_FOUND: {
    ar: 'حساب المسؤول غير موجود.',
    en: 'Administrator account not found',
  },
  AMENITY_CODE_EXISTS: {
    ar: 'رمز المرفق مستخدم بالفعل.',
    en: 'Amenity code already exists',
  },
  AMENITY_HAS_BOOKINGS: {
    ar: 'لا يمكن تعديل مرفق مرتبط بحجوزات.',
    en: 'Amenity used by a reserved bus cannot change',
  },
  AMENITY_IN_USE: {
    ar: 'المرفق مستخدم بالفعل.',
    en: 'Amenity is assigned to a bus',
  },
  AMENITY_NOT_FOUND: {
    ar: 'المرفق غير موجود.',
    en: 'Amenity not found',
  },
  BOOKING_EXPIRED: {
    ar: 'انتهت مهلة الحجز. اختر المقاعد من جديد.',
    en: 'This booking is too close to expiry or has expired',
  },
  BOOKING_NOT_FOUND: {
    ar: 'الحجز غير موجود.',
    en: 'Booking not found',
  },
  BOOKING_NOT_PAYABLE: {
    ar: 'لا يمكن دفع هذا الحجز في حالته الحالية.',
    en: 'This booking cannot prepare a payment',
  },
  BOOKING_SEATS_UNAVAILABLE: {
    ar: 'بعض مقاعد الحجز لم تعد متاحة.',
    en: 'The booking no longer holds all selected seats',
  },
  BOOTSTRAP_ACCOUNT_REQUIRED: {
    ar: 'أنشئ حسابًا مؤهلًا أولًا.',
    en: 'Register and verify an active account before bootstrapping it',
  },
  BOOTSTRAP_COMPLETED: {
    ar: 'اكتمل إعداد المسؤول الأول بالفعل.',
    en: 'A super admin already exists; use administrator management',
  },
  BUS_HAS_BOOKINGS: {
    ar: 'الحافلة مرتبطة بحجوزات.',
    en: 'A bus with reservations cannot change its type or amenities',
  },
  BUS_HAS_TRIPS: {
    ar: 'الحافلة مرتبطة برحلات.',
    en: 'A bus used by trips cannot change its seat count or seat layout',
  },
  BUS_INACTIVE: {
    ar: 'الحافلة غير مفعلة.',
    en: 'Scheduled trips require an active bus',
  },
  BUS_IN_USE: {
    ar: 'الحافلة مستخدمة بالفعل.',
    en: 'This bus or its seats are referenced by other records',
  },
  BUS_NOT_FOUND: {
    ar: 'الحافلة غير موجودة.',
    en: 'Bus not found',
  },
  BUS_SCHEDULE_CONFLICT: {
    ar: 'يوجد تعارض في مواعيد الحافلة.',
    en: 'No trips were created; refresh the batch preview and resolve bus schedule conflicts',
  },
  BUS_TYPE_CODE_EXISTS: {
    ar: 'رمز نوع الحافلة مستخدم بالفعل.',
    en: 'Bus type code already exists',
  },
  BUS_TYPE_HAS_BOOKINGS: {
    ar: 'نوع الحافلة مرتبط بحجوزات.',
    en: 'Bus type used by a reserved bus cannot change',
  },
  BUS_TYPE_IN_USE: {
    ar: 'نوع الحافلة مستخدم بالفعل.',
    en: 'Bus type is assigned to a bus',
  },
  BUS_TYPE_NOT_FOUND: {
    ar: 'نوع الحافلة غير موجود.',
    en: 'Bus type not found',
  },
  CHECKOUT_CLOSED: {
    ar: 'الدفع لهذا الحجز مغلق حاليًا.',
    en: 'Read this booking payment status',
  },
  CITY_HAS_STATIONS: {
    ar: 'المدينة مرتبطة بمحطات.',
    en: 'The request could not be completed.',
  },
  CITY_NOT_FOUND: {
    ar: 'المدينة غير موجودة.',
    en: 'City not found',
  },
  CSRF_REJECTED: {
    ar: 'تعذر التحقق من مصدر الطلب. افتح الموقع وحاول مجددًا.',
    en: 'Request origin or CSRF protection header is invalid',
  },
  FORBIDDEN: {
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
    en: 'You do not have permission for this action',
  },
  INVALID_CREDENTIALS: {
    ar: 'راجع البريد وكلمة المرور وتأكد من تفعيل البريد.',
    en: 'Unable to sign in with these credentials',
  },
  INVALID_DEPARTURE_TIME: {
    ar: 'موعد المغادرة غير صالح.',
    en: 'Choose an unambiguous Cairo departure time on ',
  },
  INVALID_JSON: {
    ar: 'يجب إرسال بيانات JSON صالحة.',
    en: 'Request body must be valid JSON',
  },
  INVALID_PAYMENT_SIGNATURE: {
    ar: 'تعذر التحقق من إشعار الدفع.',
    en: 'Invalid payment notification',
  },
  INVALID_RESET_CODE: {
    ar: 'رمز الاستعادة غير صحيح أو انتهت صلاحيته.',
    en: 'Invalid or expired password reset code',
  },
  INVALID_SEATS: {
    ar: 'اختيار المقاعد غير صالح.',
    en: 'Choose distinct seats belonging to this trip bus',
  },
  INVALID_VERIFICATION_CODE: {
    ar: 'رمز التفعيل غير صحيح أو انتهت صلاحيته.',
    en: 'Invalid or expired verification code',
  },
  LAST_SUPER_ADMIN: {
    ar: 'لا يمكن إزالة آخر مسؤول رئيسي نشط.',
    en: 'Keep at least one active email-verified super admin',
  },
  NOT_FOUND: {
    ar: 'المسار غير موجود.',
    en: 'Route not found',
  },
  NO_DEPARTURES: {
    ar: 'لا توجد مواعيد مغادرة مطابقة.',
    en: 'The date range contains none of the chosen weekdays',
  },
  PAYLOAD_TOO_LARGE: {
    ar: 'حجم البيانات يتجاوز الحد المسموح: 100 كيلوبايت.',
    en: 'JSON request body must not exceed 100kb',
  },
  PAYMENTS_UNRESOLVED: {
    ar: 'توجد عمليات دفع تحتاج إلى مراجعة.',
    en: 'Resolve pending payments and review cases before cancelling this trip',
  },
  PAYMENT_ATTEMPT_EXISTS: {
    ar: 'توجد محاولة دفع لهذا الحجز بالفعل.',
    en: 'Use the original idempotency key or retrieve the existing payment attempt',
  },
  PAYMENT_ATTEMPT_MISMATCH: {
    ar: 'محاولة الدفع لا تطابق هذا الطلب.',
    en: 'The payment attempt no longer matches this booking',
  },
  PAYMENT_ATTEMPT_NOT_FOUND: {
    ar: 'محاولة الدفع غير موجودة.',
    en: 'Payment attempt not found',
  },
  PAYMENT_ATTEMPT_REQUIRED: {
    ar: 'جهّز محاولة الدفع أولًا.',
    en: 'Prepare this booking payment first',
  },
  PAYMENT_CUSTOMER_INVALID: {
    ar: 'بيانات صاحب الدفع غير صالحة.',
    en: 'Update your account/contact details before payment',
  },
  PAYMENT_NOTIFICATION_MISMATCH: {
    ar: 'إشعار الدفع لا يطابق العملية.',
    en: 'Payment notification is not for this integration',
  },
  PAYMENT_NOT_FOUND: {
    ar: 'عملية الدفع غير موجودة.',
    en: 'Payment not found',
  },
  PAYMENT_NOT_REQUIRED: {
    ar: 'هذا الحجز لا يحتاج إلى دفع جديد.',
    en: 'This booking has no payable amount',
  },
  PAYMENT_PROVIDER_CHANGED: {
    ar: 'تغير إعداد مزود الدفع. راجع حالة الحجز.',
    en: 'Payment configuration changed',
  },
  PAYMENT_UNAVAILABLE: {
    ar: 'الدفع الإلكتروني غير متاح حاليًا. راجع حالة حجزك قبل المحاولة مجددًا.',
    en: 'Payment verification is unavailable',
  },
  PAYMENT_WEBHOOK_DISABLED: {
    ar: 'استقبال إشعارات الدفع غير متاح حاليًا.',
    en: 'Payment webhook is not enabled',
  },
  PAYMENT_WINDOW_TOO_SHORT: {
    ar: 'الوقت المتبقي غير كافٍ لبدء الدفع.',
    en: 'At least one minute must remain to create a new checkout',
  },
  PLATE_NUMBER_EXISTS: {
    ar: 'رقم لوحة الحافلة مستخدم بالفعل.',
    en: 'A bus with this plate number already exists',
  },
  RATE_LIMITED: {
    ar: 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.',
    en: 'Too many requests; try again later',
  },
  REFUND_NOT_FOUND: {
    ar: 'عملية الاسترداد غير موجودة.',
    en: 'Refund not found',
  },
  REFUND_REVIEW_REQUIRED: {
    ar: 'تحتاج عملية الاسترداد إلى مراجعة.',
    en: 'Verified payment references are required',
  },
  ROUTE_EXISTS: {
    ar: 'خط السير موجود بالفعل.',
    en: 'A route in this direction already exists',
  },
  ROUTE_HAS_TRIPS: {
    ar: 'خط السير مرتبط برحلات.',
    en: 'A route used by trips cannot change its endpoints; create another route',
  },
  ROUTE_INACTIVE: {
    ar: 'خط السير غير مفعل.',
    en: 'Scheduled trips require an active route',
  },
  ROUTE_IN_USE: {
    ar: 'خط السير مستخدم بالفعل.',
    en: 'This route is referenced by other records',
  },
  ROUTE_NOT_FOUND: {
    ar: 'خط السير غير موجود.',
    en: 'Route not found',
  },
  SEAT_UNAVAILABLE: {
    ar: 'حجز شخص آخر أحد المقاعد. اختر مقعدًا متاحًا.',
    en: 'One or more selected seats are already reserved',
  },
  STATION_HAS_ROUTES: {
    ar: 'المحطة مرتبطة بخطوط سير.',
    en: 'Remove routes using this station before deleting it',
  },
  STATION_NOT_FOUND: {
    ar: 'المحطة غير موجودة.',
    en: 'Station not found',
  },
  TICKET_NOT_FOUND: {
    ar: 'التذكرة غير موجودة أو لم تُصدر بعد.',
    en: 'Ticket not found',
  },
  TRIP_CANCELLED: {
    ar: 'أُلغيت الرحلة.',
    en: 'An operator-cancelled trip cannot be changed',
  },
  TRIP_DEPARTED: {
    ar: 'غادرت الرحلة بالفعل.',
    en: 'Only future trips may be cancelled',
  },
  TRIP_HAS_BOOKINGS: {
    ar: 'الرحلة مرتبطة بحجوزات.',
    en: 'A trip with reservations cannot be changed',
  },
  TRIP_IN_USE: {
    ar: 'الرحلة مستخدمة بالفعل.',
    en: 'This trip is referenced by other records',
  },
  TRIP_NOT_FOUND: {
    ar: 'الرحلة غير موجودة.',
    en: 'Trip not found',
  },
  TRIP_REFERENCE_NOT_FOUND: {
    ar: 'مرجع الرحلة غير موجود.',
    en: 'Route or bus not found',
  },
  TRIP_UNAVAILABLE: {
    ar: 'الرحلة غير متاحة للحجز.',
    en: 'This trip cannot accept reservations',
  },
  UNAUTHENTICATED: {
    ar: 'سجّل الدخول للمتابعة.',
    en: 'Authentication required',
  },
  UNAUTHORIZED: {
    ar: 'سجّل الدخول للمتابعة.',
    en: 'Authentication required',
  },
  UNSUPPORTED_MEDIA_TYPE: {
    ar: 'يجب إرسال البيانات بصيغة JSON.',
    en: 'Content-Type must be application/json',
  },
  USER_NOT_FOUND: {
    ar: 'الحساب غير موجود.',
    en: 'Account not found',
  },
  VALIDATION_ERROR: {
    ar: 'راجع البيانات المدخلة وحاول مجددًا.',
    en: 'Check your details and try again.',
  },
  SUCCESS: {
    ar: 'تمت العملية بنجاح.',
    en: 'The request completed successfully.',
  },
  CREATED: {
    ar: 'تم الإنشاء بنجاح.',
    en: 'Created successfully.',
  },
  ACCEPTED: {
    ar: 'تم استلام الطلب.',
    en: 'The request was accepted.',
  },
  REGISTRATION_PENDING: {
    ar: 'إذا أمكن إنشاء الحساب، ستصلك رسالة لتفعيل البريد.',
    en: 'If registration can proceed, a verification email will be sent.',
  },
  EMAIL_VERIFIED: {
    ar: 'تم تفعيل البريد الإلكتروني بنجاح.',
    en: 'Email verified successfully.',
  },
  VERIFICATION_SENT: {
    ar: 'إذا كان الحساب يحتاج إلى تفعيل وكان الإرسال متاحًا، ستصلك رسالة تفعيل.',
    en: 'If verification is needed and sending is allowed, a verification email will be sent.',
  },
  PASSWORD_RESET_REQUESTED: {
    ar: 'إذا كانت استعادة الحساب متاحة، ستصلك رسالة لإعادة تعيين كلمة المرور.',
    en: 'If recovery is available for this account, a password reset email will be sent.',
  },
  PASSWORD_RESET: {
    ar: 'تم تغيير كلمة المرور. سجّل الدخول بالكلمة الجديدة.',
    en: 'Password reset successfully. Sign in with your new password.',
  },
  SERVICE_UNAVAILABLE: {
    ar: 'الخدمة غير متاحة مؤقتًا. حاول لاحقًا.',
    en: 'The service is temporarily unavailable.',
  },
  REQUEST_FAILED: {
    ar: 'تعذر إكمال الطلب. حاول مجددًا.',
    en: 'The request could not be completed. Please try again.',
  },
  INTERNAL_SERVER_ERROR: {
    ar: 'حدث خطأ غير متوقع. حاول لاحقًا.',
    en: 'An unexpected error occurred. Please try again later.',
  },
};
