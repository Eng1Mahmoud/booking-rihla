import { PasswordRecovery } from '@/features/auth/server';
export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)]">
      <PasswordRecovery initialStep="reset" />
    </div>
  );
}
