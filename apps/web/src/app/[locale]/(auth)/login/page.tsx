import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/features/auth/lib/auth.server';
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
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)]">
      <LoginScreen
        returnTo={typeof query.returnTo === 'string' ? query.returnTo : '/'}
      />
    </div>
  );
}
