'use client';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
export function LanguageSwitcher({
  onNavigate,
}: { onNavigate?: () => void } = {}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === 'ar' ? 'en' : 'ar';
  return (
    <Link
      href={pathname}
      locale={other}
      className="text-xs font-medium hover:text-primary md:text-sm"
      dir="ltr"
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
        router.replace(pathname + window.location.search, { locale: other });
      }}
    >
      {other === 'ar' ? 'العربية' : 'English'}
    </Link>
  );
}
