import { BusFront, ArrowUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const groups = [
    {
      title: 'explore',
      links: [
        { href: '/', label: 'home' },
        { href: '/#trip-search-title', label: 'search' },
        { href: '/stations', label: 'stations' },
      ],
    },
    {
      title: 'discover',
      links: [
        { href: '/about', label: 'about' },
        { href: '/faqs', label: 'faqs' },
      ],
    },
  ];
  return (
    <footer className="border-t border-white/10 bg-secondary-foreground text-white">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px]">
        <div className="grid gap-9 py-10 md:py-14 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <Link
              href="/"
              aria-label={t('home')}
              dir="ltr"
              className="inline-flex min-h-11 items-center gap-3 text-4xl font-semibold tracking-tight text-white md:text-5xl"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
                <BusFront size={24} aria-hidden="true" />
              </span>
              <span>Rihla.</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-8 text-white/75">
              {t('description')}
            </p>
          </div>
          <nav
            aria-label={t('navigation')}
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-12"
          >
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-3 text-sm font-semibold text-white">
                  {t(group.title)}
                </h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center py-2 text-sm leading-6 text-white/75 hover:text-white hover:underline underline-offset-4"
                      >
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/15 py-4 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="leading-6">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <a
            href="#top"
            className="inline-flex min-h-11 items-center gap-2 self-start text-white/75 hover:text-white hover:underline underline-offset-4"
          >
            {t('backToTop')}
            <ArrowUp size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
