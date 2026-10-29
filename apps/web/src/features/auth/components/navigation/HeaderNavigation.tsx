'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import {
  Menu,
  X,
  Search,
  MapPin,
  CircleHelp,
  Info,
  Ticket,
  UserRound,
  BusFront,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useLoginHref } from '../../hooks/useLoginHref';
import { LanguageSwitcher } from '@/shared/components/layout';

export function HeaderNavigation() {
  const t = useTranslations('Header');
  const auth = useTranslations('Auth');
  const locale = useLocale();
  const { status } = useAuth();
  const pathname = usePathname();
  const loginHref = useLoginHref();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/', label: 'search', Icon: Search },
    { href: '/stations', label: 'stations', Icon: MapPin },
    { href: '/faqs', label: 'faqs', Icon: CircleHelp },
    { href: '/about', label: 'about', Icon: Info },
    ...(status === 'signed-in'
      ? [{ href: '/bookings', label: 'bookings', Icon: Ticket }]
      : []),
  ];
  const mobileLinks =
    status === 'signed-in'
      ? [...links, { href: '/account', label: 'account', Icon: UserRound }]
      : links;
  const active = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);

  return (
    <>
      <nav
        className="hidden items-center gap-4 text-sm lg:flex xl:gap-7"
        aria-label={t('navigation')}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active(link.href) ? 'page' : undefined}
            className={cn(
              'relative after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:rounded after:bg-primary after:scale-x-0 aria-[current=page]:after:scale-x-100 hover:after:scale-x-100 motion-safe:after:transition-transform motion-safe:after:duration-180 inline-flex min-h-11 shrink-0 items-center whitespace-nowrap font-medium hover:text-primary',
              active(link.href) && 'font-medium text-primary',
            )}
          >
            {t(link.label)}
          </Link>
        ))}
      </nav>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="order-3 size-11 shrink-0 lg:hidden"
            aria-label={t('openMenu')}
          >
            <Menu className="size-6" aria-hidden="true" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-secondary-foreground/40 backdrop-blur-[4px]" />
          <Dialog.Content
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className="fixed inset-y-0 start-0 z-50 flex h-dvh w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden border-e bg-card shadow-2xl outline-none"
          >
            <div className="px-5 pt-5">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Close asChild>
                  <Link
                    href="/"
                    dir="ltr"
                    aria-label={t('home')}
                    className="inline-flex min-h-11 items-center gap-2.5 text-2xl font-semibold"
                  >
                    <BusFront
                      size={25}
                      aria-hidden="true"
                      className="text-primary"
                    />
                    <span>
                      Rihla<span className="text-primary">.</span>
                    </span>
                  </Link>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label={t('closeMenu')}
                  >
                    <X className="size-5" aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Title className="mt-6 text-xl font-semibold">
                {t('menuTitle')}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
                {t('menuDescription')}
              </Dialog.Description>
            </div>
            <nav
              aria-label={t('navigation')}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-6"
            >
              {mobileLinks.map(({ href, label, Icon }) => (
                <Dialog.Close key={href} asChild>
                  <Link
                    href={href}
                    aria-current={active(href) ? 'page' : undefined}
                    className={cn(
                      'flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground',
                      active(href) && 'bg-secondary text-primary',
                    )}
                  >
                    <Icon size={20} aria-hidden="true" className="shrink-0" />
                    <span>{t(label)}</span>
                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className="ms-auto shrink-0 rtl:rotate-180"
                    />
                  </Link>
                </Dialog.Close>
              ))}
            </nav>
            <div className="border-t px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{t('language')}</span>
                <div className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
                  <LanguageSwitcher onNavigate={() => setOpen(false)} />
                </div>
              </div>
              {status === 'guest' && (
                <Dialog.Close asChild>
                  <Button asChild size="lg" className="w-full">
                    <Link href={loginHref}>
                      <LogIn size={18} aria-hidden="true" />
                      {auth('login')}
                    </Link>
                  </Button>
                </Dialog.Close>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
