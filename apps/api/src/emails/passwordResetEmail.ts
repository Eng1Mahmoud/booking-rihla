import {
  bodyParagraph,
  codeBadge,
  mutedParagraph,
  primaryNote,
  renderEmailShell,
} from './layout.ts';

export function passwordResetEmail(code: string, language: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid reset code format');
  const ar = language === 'ar';
  const subject = ar
    ? 'إعادة تعيين كلمة المرور — رحلة'
    : 'Reset your password — Rihla';
  const text = ar
    ? 'كود إعادة تعيين كلمة المرور: ' +
      code +
      '\nصالح لمدة 10 دقائق. إذا لم تطلب ذلك، تجاهل الرسالة ولا تشارك الكود.'
    : 'Your password reset code: ' +
      code +
      '\nValid for 10 minutes. If you did not request this, ignore the message and do not share the code.';

  const bodyHtml = [
    bodyParagraph(
      ar
        ? 'استلمنا طلبًا لإعادة تعيين كلمة مرور حسابك. استخدم الكود التالي للمتابعة.'
        : 'We received a request to reset your account password. Use the code below to continue.',
    ),
    codeBadge(code),
    primaryNote(
      ar
        ? 'الكود صالح لمدة 10 دقائق. لا تشاركه مع أي شخص.'
        : 'This code is valid for 10 minutes. Do not share it with anyone.',
      'warning',
    ),
    mutedParagraph(
      ar
        ? 'إذا لم تطلب إعادة التعيين، تجاهل الرسالة. لن يتم تغيير كلمة المرور.'
        : 'If you did not request a reset, ignore this email. Your password will stay unchanged.',
    ),
  ].join('');

  return {
    subject,
    text,
    html: renderEmailShell({
      language,
      title: ar ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
      eyebrow: ar ? 'أمان الحساب' : 'Account security',
      preheader: ar ? `كود الاستعادة: ${code}` : `Your reset code: ${code}`,
      bodyHtml,
    }),
  };
}

export function passwordChangedEmail(language: string) {
  const ar = language === 'ar';
  const subject = ar
    ? 'تم تغيير كلمة المرور — رحلة'
    : 'Your password was changed — Rihla';
  const text = ar
    ? 'تم تغيير كلمة مرور حسابك وإلغاء جلسات الدخول السابقة. إذا لم تقم بذلك، استخدم استعادة كلمة المرور لتأمين حسابك.'
    : 'Your account password was changed and previous sign-in sessions were revoked. If this was not you, use password recovery to secure your account.';

  const bodyHtml = [
    bodyParagraph(
      ar
        ? 'تم تحديث كلمة مرور حسابك بنجاح، وتم تسجيل الخروج من الجلسات السابقة لحماية حسابك.'
        : 'Your account password was updated successfully. Previous sign-in sessions were signed out to protect your account.',
    ),
    primaryNote(
      ar
        ? 'إذا لم تقم بهذا التغيير، أعد تعيين كلمة المرور فورًا من صفحة استعادة الحساب.'
        : 'If you did not make this change, reset your password immediately from the account recovery page.',
      'warning',
    ),
  ].join('');

  return {
    subject,
    text,
    html: renderEmailShell({
      language,
      title: ar ? 'تم تغيير كلمة المرور' : 'Password changed',
      eyebrow: ar ? 'تنبيه أمني' : 'Security notice',
      preheader: subject,
      bodyHtml,
    }),
  };
}
