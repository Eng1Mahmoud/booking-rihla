export function verificationEmail(code: string, language: string) {
  if (!/^\d{6}$/.test(code))
    throw new Error('Invalid verification code format');
  const arabic = language === 'ar';
  const subject = arabic
    ? 'تأكيد البريد الإلكتروني - حجز الحافلات'
    : 'Verify your email - Bus Booking';
  const text = arabic
    ? 'كود تأكيد بريدك الإلكتروني: ' +
      code +
      '\nصالح لمدة 10 دقائق. إذا لم تطلب إنشاء حساب، تجاهل الرسالة.'
    : 'Your email verification code: ' +
      code +
      '\nValid for 10 minutes. If you did not request an account, ignore this email.';
  return {
    subject,
    text,
    html:
      '<!doctype html><html lang="' +
      (arabic ? 'ar' : 'en') +
      '" dir="' +
      (arabic ? 'rtl' : 'ltr') +
      '"><body><h1>' +
      subject +
      '</h1><p style="white-space:pre-line">' +
      text +
      '</p></body></html>',
  };
}
