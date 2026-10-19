import { PasswordRecovery } from '@/features/auth/components/PasswordRecovery';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className="container-shell">
      <PasswordRecovery
        initialStep="reset"
        returnTo={safeReturnPath(returnTo)}
      />
    </div>
  );
}
