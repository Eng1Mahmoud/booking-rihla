'use client';
import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import { errorMessage, invokeAction } from '@/shared/lib/apiResult';
import { logoutAction } from '../actions/auth.actions';

export function StaffAccountMenu() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const client = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  function signOut() {
    startTransition(async () => {
      setError('');
      try {
        await invokeAction(logoutAction);
        client.clear();
        setOpen(false);
        router.replace('/login');
        router.refresh();
      } catch (cause) {
        setError(errorMessage(cause, locale));
        setOpen(true);
      }
    });
  }
  return (
    <DropdownMenu
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="min-h-12 gap-2 rounded-full p-1 pe-2.5"
          aria-label={t('accountMenu')}
          disabled={pending}
        >
          <span className="grid size-10 place-items-center rounded-full bg-secondary-foreground text-white">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 max-w-[calc(100vw-2rem)]"
      >
        <p className="px-3 py-2.5 text-sm font-medium">{t('staffAccount')}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          aria-busy={pending}
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            signOut();
          }}
        >
          <LogOut aria-hidden="true" />
          {t(pending ? 'signingOut' : 'logout')}
        </DropdownMenuItem>
        {error && (
          <p role="alert" className="px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
