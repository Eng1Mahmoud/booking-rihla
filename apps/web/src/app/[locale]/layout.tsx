import { dehydrate } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';
import { authKeys } from '@/features/auth/hooks/auth.queries';
import { getAuthSession } from '@/features/auth/lib/auth.server';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@/app/globals.css';
import { AppProviders } from '@/app/providers';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/shared/components/layout/SiteHeader';
import { SiteFooter } from '@/shared/components/layout/SiteFooter';
import { AccountMenu } from '@/features/auth/components/AccountMenu';
export const metadata: Metadata = {
  title: 'Rihla | Bus booking',
  description: 'Find a bus trip and choose your seat.',
};
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Request-local QueryClient: hydrate only the safe user view, never credentials.
  const queryClient = createQueryClient();
  queryClient.setQueryData(authKeys.me, await getAuthSession());
  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="scroll-pt-24 lg:scroll-pt-[100px]"
    >
      <body id="top" className="min-h-screen">
        <NextIntlClientProvider>
          <AppProviders state={dehydrate(queryClient)}>
            <div className="flex min-h-screen flex-col">
              <SiteHeader accountMenu={<AccountMenu />} />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
