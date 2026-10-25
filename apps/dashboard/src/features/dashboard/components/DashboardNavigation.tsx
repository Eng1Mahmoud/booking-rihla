'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import {
  BusFront,
  CreditCard,
  House,
  Menu,
  X,
  ExternalLink,
  Building2,
  MapPin,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/shared/lib/cn';
function NavigationLinks() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const pathname = usePathname();
  const onOverview = pathname === '/dashboard';
  const sectionBase = onOverview ? '' : '/' + locale + '/dashboard';
  return (
    <nav className="grid gap-[5px] px-3.5" aria-label={t('navigation')}>
      <a
        href={sectionBase + '#overview'}
        aria-current={onOverview ? 'page' : undefined}
        className={cn(
          'flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]',
          onOverview && 'bg-[#0b6372]',
        )}
      >
        <House className="size-[23px] shrink-0" aria-hidden="true" />
        {t('overview')}
      </a>
      <a
        href={sectionBase + '#operations'}
        className="flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]"
      >
        <BusFront className="size-[23px] shrink-0" aria-hidden="true" />
        {t('operations')}
      </a>
      <a
        href={sectionBase + '#payments'}
        className="flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]"
      >
        <CreditCard className="size-[23px] shrink-0" aria-hidden="true" />
        {t('payments')}
      </a>
      {[
        { href: '/dashboard/cities', label: t('cities'), Icon: Building2 },
        { href: '/dashboard/stations', label: t('stations'), Icon: MapPin },
      ].map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          className={cn(
            'flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]',
            pathname === href && 'bg-[#0b6372]',
          )}
        >
          <Icon className="size-[23px] shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function DashboardNavigation({ website }: { website: string }) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);
  return (
    <>
      <div className="hidden lg:block">
        <NavigationLinks />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            aria-label={t('openMenu')}
          >
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent
          showCloseButton={false}
          side={locale === 'ar' ? 'right' : 'left'}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className="w-[min(22rem,calc(100vw-2rem))] max-w-none overflow-y-auto border-0 bg-secondary-foreground pb-5 sm:max-w-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between gap-4 p-5">
            <SheetTitle className="text-xl font-semibold text-white">
              {t('navigation')}
            </SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-white hover:text-foreground"
                aria-label={t('closeMenu')}
              >
                <X aria-hidden="true" />
              </Button>
            </SheetClose>
          </div>
          <div
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) setOpen(false);
            }}
          >
            <NavigationLinks />
          </div>
          <a
            href={website}
            className="mx-6 mt-[38px] flex min-h-14 items-center gap-4 border-t border-[#466071] py-5 text-[14px] text-white"
          >
            <ExternalLink className="size-[21px] shrink-0" aria-hidden="true" />
            {t('backWebsite')}
          </a>
        </SheetContent>
      </Sheet>
    </>
  );
}
