'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, LogOut, LogIn } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth, useLogout } from '../../hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import { UserAvatar } from '@/features/account/components/UserAvatar';
import { accountLinks } from '@/features/account/accountLinks';

export function AccountMenu() {
  const { user, status, reloadSession } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Account');
  const auth = useTranslations('Auth');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const loginHref =
    pathname && pathname !== '/login'
      ? '/login?returnTo=' + encodeURIComponent(pathname)
      : '/login';

  async function signOut() {
    setError('');
    try {
      await logout.mutateAsync(false);
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause, locale));
    }
  }

  if (status === 'loading')
    return (
      <span
        role="status"
        aria-label={t('loading')}
        className="size-11 rounded-full bg-secondary motion-safe:animate-pulse"
      />
    );
  if (status === 'unavailable')
    return (
      <Button variant="link" onClick={reloadSession}>
        {auth('retrySession')}
      </Button>
    );
  if (!user)
    return (
      <Button asChild variant="ghost" className="min-h-11 rounded-full">
        <Link href={loginHref} aria-label={auth('login')}>
          <LogIn aria-hidden="true" />
          <span className="hidden sm:inline">{auth('login')}</span>
        </Link>
      </Button>
    );

  return (
    <DropdownMenu
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto min-h-11 gap-2 rounded-full p-1.5 sm:pe-3"
          aria-label={t('openMenu')}
        >
          <UserAvatar className="size-9" />
          <span className="hidden max-w-28 truncate sm:block">
            {user.name.split(' ')[0]}
          </span>
          <ChevronDown
            className="hidden text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <div className="flex min-w-0 items-center gap-3 px-3 py-4">
          <UserAvatar className="size-11" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <bdi>{user.email}</bdi>
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        {accountLinks.map(({ href, label, Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon aria-hidden="true" />
              {t(label)}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut aria-hidden="true" />
          {logout.isPending ? t('working') : auth('logout')}
        </DropdownMenuItem>
        {error && (
          <p
            role="alert"
            className="px-3 py-2 text-xs leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
