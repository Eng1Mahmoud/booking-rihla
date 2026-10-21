import { PasswordRecovery } from '@/features/auth/components/password-recovery/PasswordRecovery';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)]">
      <PasswordRecovery
        initialStep="request"
        returnTo={safeReturnPath(returnTo)}
      />
    </div>
  );
}
