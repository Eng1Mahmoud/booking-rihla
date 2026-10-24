'use client';
import { useSearchParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';

export function useLoginHref() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (
    !pathname?.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === '/login'
  )
    return '/login';

  const search = searchParams.toString();
  const returnTo = pathname + (search ? '?' + search : '');
  return '/login?returnTo=' + encodeURIComponent(returnTo);
}
