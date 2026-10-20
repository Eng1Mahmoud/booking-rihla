import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/features/auth/api/auth.queries';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
import { LoginScreen } from '@/features/auth/components/LoginScreen';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  if (user)
    redirect('/' + (await getLocale()) + safeReturnPath(query.returnTo));
  return (
    <div className="container-shell">
      <LoginScreen
        returnTo={typeof query.returnTo === 'string' ? query.returnTo : '/'}
      />
    </div>
  );
}
