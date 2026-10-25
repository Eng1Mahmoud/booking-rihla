'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import {
  BusFront,
  CreditCard,
  House,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
function NavigationLinks() {
  const t = useTranslations('Dashboard');
  return (
    <nav className="grid gap-[5px] px-3.5" aria-label={t('navigation')}>
      <a
        href="#overview"
        aria-current="page"
        className="flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a] bg-[#0b6372]"
      >
        <House className="size-[23px] shrink-0" aria-hidden="true" />
        {t('overview')}
      </a>
      <a
        href="#operations"
        className="flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]"
      >
        <BusFront className="size-[23px] shrink-0" aria-hidden="true" />
        {t('operations')}
      </a>
      <a
        href="#payments"
        className="flex min-h-14 items-center gap-4 rounded-[10px] px-[18px] py-3.5 text-[15px] text-white hover:bg-[#24485a]"
      >
        <CreditCard className="size-[23px] shrink-0" aria-hidden="true" />
        {t('payments')}
      </a>
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
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            aria-label={t('openMenu')}
          >
            <Menu aria-hidden="true" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-secondary-foreground/40" />
          <Dialog.Content
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className="fixed inset-y-0 start-0 z-60 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto bg-secondary-foreground pb-5"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between gap-4 p-5">
              <Dialog.Title className="text-xl font-semibold text-white">
                {t('navigation')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-white hover:text-foreground"
                  aria-label={t('closeMenu')}
                >
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
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
              <ExternalLink
                className="size-[21px] shrink-0"
                aria-hidden="true"
              />
              {t('backWebsite')}
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
