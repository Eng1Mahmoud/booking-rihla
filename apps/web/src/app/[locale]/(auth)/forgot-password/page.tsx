import { PasswordRecovery } from '@/features/auth/components/password-recovery/PasswordRecovery';
export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)]">
      <PasswordRecovery initialStep="request" />
    </div>
  );
}
