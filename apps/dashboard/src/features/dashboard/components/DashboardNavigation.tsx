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
  Wifi,
  Route as RouteIcon,
  CalendarDays,
  Ticket,
  Undo2,
  Users,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/shared/lib/cn';
function NavigationLinks({
  superAdmin,
  staffOnly,
}: {
  superAdmin: boolean;
  staffOnly: boolean;
}) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const pathname = usePathname();
  const onOverview = pathname === '/dashboard';
  const sectionBase = onOverview ? '' : '/' + locale + '/dashboard';
  if (staffOnly) {
    return (
      <nav className="grid gap-[5px] px-3.5" aria-label={t('navigation')}>
        <Link
          href="/dashboard/scan"
          className={cn(
            'flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]',
            pathname.startsWith('/dashboard/scan') && 'bg-[#0b6372]',
          )}
        >
          <QrCode className="size-[23px] shrink-0" aria-hidden="true" />
          {t('ticketScan')}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="grid gap-[5px] px-3.5" aria-label={t('navigation')}>
      <Link
        href="/dashboard/scan"
        className={cn(
          'flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]',
          pathname.startsWith('/dashboard/scan') && 'bg-[#0b6372]',
        )}
      >
        <QrCode className="size-[23px] shrink-0" aria-hidden="true" />
        {t('ticketScan')}
      </Link>
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
      {[
        { href: '/dashboard/cities', label: t('cities'), Icon: Building2 },
        { href: '/dashboard/stations', label: t('stations'), Icon: MapPin },
        { href: '/dashboard/buses', label: t('buses'), Icon: BusFront },
        { href: '/dashboard/bus-types', label: t('busTypes'), Icon: BusFront },
        { href: '/dashboard/amenities', label: t('amenities'), Icon: Wifi },
        { href: '/dashboard/routes', label: t('routes'), Icon: RouteIcon },
        {
          href: '/dashboard/trips',
          label: t('tripManagement'),
          Icon: CalendarDays,
        },
        {
          href: '/dashboard/bookings',
          label: t('bookingRecords'),
          Icon: Ticket,
        },
        {
          href: '/dashboard/payments',
          label: t('paymentRecords'),
          Icon: CreditCard,
        },
        { href: '/dashboard/users', label: t('users'), Icon: Users },
        ...(superAdmin
          ? [
              { href: '/dashboard/refunds', label: t('refunds'), Icon: Undo2 },
              {
                href: '/dashboard/administrators',
                label: t('administrators'),
                Icon: ShieldCheck,
              },
            ]
          : []),
      ].map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href || pathname.startsWith(href + '/')
              ? 'page'
              : undefined
          }
          className={cn(
            'flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]',
            (pathname === href || pathname.startsWith(href + '/')) &&
              'bg-[#0b6372]',
          )}
        >
          <Icon className="size-[23px] shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function DashboardNavigation({
  website,
  superAdmin = false,
  staffOnly = false,
}: {
  website: string;
  superAdmin?: boolean;
  staffOnly?: boolean;
}) {
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
        <NavigationLinks superAdmin={superAdmin} staffOnly={staffOnly} />
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
          className="dashboard-scrollbar w-[min(22rem,calc(100vw-2rem))] max-w-none overflow-y-auto border-0 bg-secondary-foreground pb-5 sm:max-w-none"
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
            <NavigationLinks superAdmin={superAdmin} staffOnly={staffOnly} />
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
