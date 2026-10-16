export function passwordResetEmail(code: string, language: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid reset code format');
  const ar = language === 'ar';
  const subject = ar
    ? 'إعادة تعيين كلمة المرور - حجز الحافلات'
    : 'Reset your password - Bus Booking';
  const text = ar
    ? 'كود إعادة تعيين كلمة المرور: ' +
      code +
      '\nصالح لمدة 10 دقائق. إذا لم تطلب ذلك، تجاهل الرسالة ولا تشارك الكود.'
    : 'Your password reset code: ' +
      code +
      '\nValid for 10 minutes. If you did not request this, ignore the message and do not share the code.';
  return {
    subject,
    text,
    html:
      '<!doctype html><html lang="' +
      (ar ? 'ar' : 'en') +
      '" dir="' +
      (ar ? 'rtl' : 'ltr') +
      '"><body><h1>' +
      subject +
      '</h1><p style="white-space:pre-line">' +
      text +
      '</p></body></html>',
  };
}
export function passwordChangedEmail(language: string) {
  const ar = language === 'ar';
  const subject = ar
    ? 'تم تغيير كلمة المرور - حجز الحافلات'
    : 'Your password was changed - Bus Booking';
  const text = ar
    ? 'تم تغيير كلمة مرور حسابك وإلغاء جلسات الدخول السابقة. إذا لم تقم بذلك، استخدم استعادة كلمة المرور لتأمين حسابك.'
    : 'Your account password was changed and previous sign-in sessions were revoked. If this was not you, use password recovery to secure your account.';
  return {
    subject,
    text,
    html:
      '<!doctype html><html lang="' +
      (ar ? 'ar' : 'en') +
      '" dir="' +
      (ar ? 'rtl' : 'ltr') +
      '"><body><h1>' +
      subject +
      '</h1><p>' +
      text +
      '</p></body></html>',
  };
}
