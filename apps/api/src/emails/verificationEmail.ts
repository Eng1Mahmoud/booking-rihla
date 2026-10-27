import {
  appPath,
  bodyParagraph,
  codeBadge,
  mutedParagraph,
  primaryNote,
  renderEmailShell,
} from './layout.ts';

export function verificationEmail(code: string, language: string) {
  if (!/^\d{6}$/.test(code))
    throw new Error('Invalid verification code format');
  const arabic = language === 'ar';
  const subject = arabic
    ? 'تأكيد البريد الإلكتروني — رحلة'
    : 'Verify your email — Rihla';
  const text = arabic
    ? 'كود تأكيد بريدك الإلكتروني: ' +
      code +
      '\nصالح لمدة 10 دقائق. إذا لم تطلب إنشاء حساب، تجاهل الرسالة.'
    : 'Your email verification code: ' +
      code +
      '\nValid for 10 minutes. If you did not request an account, ignore this email.';

  const bodyHtml = [
    bodyParagraph(
      arabic
        ? 'مرحبًا بك في رحلة. استخدم الكود التالي لتأكيد بريدك الإلكتروني وإكمال إنشاء الحساب.'
        : 'Welcome to Rihla. Use the code below to verify your email and finish creating your account.',
    ),
    codeBadge(code),
    primaryNote(
      arabic ? 'الكود صالح لمدة 10 دقائق فقط.' : 'This code expires in 10 minutes.',
    ),
    mutedParagraph(
      arabic
        ? 'إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.'
        : 'If you did not request an account, you can safely ignore this email.',
    ),
  ].join('');

  const loginUrl = appPath(language, '/login');

  return {
    subject,
    text,
    html: renderEmailShell({
      language,
      title: arabic ? 'تأكيد البريد الإلكتروني' : 'Verify your email',
      eyebrow: arabic ? 'أمان الحساب' : 'Account security',
      preheader: arabic
        ? `كود التأكيد: ${code}`
        : `Your verification code: ${code}`,
      bodyHtml,
      cta: loginUrl
        ? {
            label: arabic ? 'متابعة تسجيل الدخول' : 'Continue to sign in',
            href: loginUrl,
          }
        : undefined,
    }),
  };
}
