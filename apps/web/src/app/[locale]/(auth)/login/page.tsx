import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { BusFront, Check } from 'lucide-react';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import { AuthFlow } from '@/features/auth/components/forms/AuthFlow';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  const returnTo =
    typeof query.returnTo === 'string' && query.returnTo.startsWith('/')
      ? query.returnTo
      : '/';
  const user = await getSignedInUser().catch(() => null);
  if (user)
    redirect('/' + (await getLocale()) + (returnTo === '/' ? '' : returnTo));
  const [t, home] = await Promise.all([
    getTranslations('Auth'),
    getTranslations('Home'),
  ]);
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)]">
      <section className="mx-auto grid w-[calc(100%-2rem)] max-w-[1100px] gap-6 py-7 md:grid-cols-2 md:items-stretch md:gap-12 md:py-12">
        <div className="relative isolate flex flex-col justify-end overflow-hidden rounded-[2rem] bg-secondary-foreground p-7 text-white md:min-h-[580px] md:p-9">
          <Image
            src="/images/rihla-coastal-journey.webp"
            alt=""
            fill
            sizes="(min-width: 768px) 520px, 100vw"
            className="-z-20 hidden object-cover object-[70%_center] md:block"
          />
          <div
            className="absolute inset-0 -z-10 bg-linear-to-t from-[#112f45] via-[#112f45]/55 to-[#112f45]/5"
            aria-hidden="true"
          />
          <BusFront
            size={32}
            strokeWidth={1.5}
            className="mb-5 text-white/85"
            aria-hidden="true"
          />
          <h1 className="max-w-sm text-3xl font-semibold leading-[1.5] text-white md:text-4xl">
            {t('welcome')}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-8 text-white/80">
            {t('welcomeText')}
          </p>
          <p className="mt-6 hidden items-center gap-2 text-sm text-white/85 md:flex">
            <Check size={17} aria-hidden="true" />
            {home('heroBooking')}
          </p>
        </div>
        <div className="self-center rounded-[1.75rem] border border-white bg-card p-6 shadow-[0_20px_70px_-45px_#112f4550] sm:p-9">
          <AuthFlow returnTo={returnTo} />
        </div>
      </section>
    </div>
  );
}
