import { LoginScreen } from '@/features/auth/components/LoginScreen';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="container-shell">
      <LoginScreen
        returnTo={typeof query.returnTo === 'string' ? query.returnTo : '/'}
      />
    </div>
  );
}
