'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CircleHelp,
  Search,
  Ticket,
  CreditCard,
  MapPin,
  UserRound,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { PageIntro } from '@/shared/components/layout/PageIntro';
import { Link } from '@/i18n/navigation';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { searchText } from '@/shared/lib/searchText';

const categories = [
  {
    id: 'booking',
    Icon: Ticket,
    questions: ['account', 'seat', 'cancellation'],
  },
  { id: 'payment', Icon: CreditCard, questions: ['deadline', 'pending'] },
  { id: 'ticket', Icon: Ticket, questions: ['issued', 'qr'] },
  { id: 'station', Icon: MapPin, questions: ['location', 'city'] },
  { id: 'account', Icon: UserRound, questions: ['password'] },
] as const;

export function FaqContent() {
  const t = useTranslations('FAQ');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const term = searchText(search);
  const groups = categories
    .filter((group) => category === 'all' || group.id === category)
    .map((group) => ({
      ...group,
      questions: group.questions.filter(
        (id) =>
          !term ||
          searchText(
            t('questions.' + id + '.q') + ' ' + t('questions.' + id + '.a'),
          ).includes(term),
      ),
    }))
    .filter((group) => group.questions.length);
  const count = groups.reduce(
    (total, group) => total + group.questions.length,
    0,
  );
  const clear = () => {
    setSearch('');
    setCategory('all');
  };
  return (
    <>
      <PageIntro
        title={t('title')}
        description={t('intro')}
        eyebrow={t('eyebrow')}
      >
        <div className="relative mt-7 max-w-xl">
          <label htmlFor="faq-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <Search
            size={19}
            aria-hidden="true"
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="faq-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-14 bg-card ps-12"
          />
        </div>
      </PageIntro>
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] gap-8 py-8 md:grid-cols-[240px_1fr] md:gap-12 md:py-12">
        <aside className="self-start md:sticky md:top-28">
          <nav
            aria-label={t('categoriesLabel')}
            className="flex flex-wrap gap-2 md:flex-col"
          >
            <Button
              type="button"
              variant="ghost"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
              className={cn(
                'min-h-11 justify-start gap-3 px-4',
                category === 'all' && 'bg-secondary text-primary',
              )}
            >
              <CircleHelp size={18} aria-hidden="true" />
              {t('all')}
            </Button>
            {categories.map(({ id, Icon }) => (
              <Button
                key={id}
                type="button"
                variant="ghost"
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
                className={cn(
                  'min-h-11 justify-start gap-3 px-4',
                  category === id && 'bg-secondary text-primary',
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {t('categories.' + id)}
              </Button>
            ))}
          </nav>
          <div className="mt-7 hidden border-t pt-6 md:block">
            <p className="text-sm font-medium">{t('stationTitle')}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('stationText')}
            </p>
            <Link
              href="/stations"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t('stationLink')}
              <ArrowLeft
                size={16}
                aria-hidden="true"
                className="ltr:rotate-180"
              />
            </Link>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              {t('results', { count })}
            </p>
            {(search || category !== 'all') && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={clear}
              >
                {t('clear')}
              </Button>
            )}
          </div>
          {groups.length ? (
            <div className="space-y-9">
              {groups.map((group) => (
                <section key={group.id} aria-labelledby={'faq-' + group.id}>
                  <h2
                    id={'faq-' + group.id}
                    className="mb-4 text-xl font-semibold"
                  >
                    {t('categories.' + group.id)}
                  </h2>
                  <div className="divide-y rounded-[1.5rem] border border-border/70 bg-card px-5 md:px-7">
                    {group.questions.map((id) => (
                      <details
                        key={id}
                        open={term ? true : undefined}
                        className="group"
                      >
                        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:text-base [&::-webkit-details-marker]:hidden">
                          <span>{t('questions.' + id + '.q')}</span>
                          <ChevronDown
                            size={18}
                            aria-hidden="true"
                            className="shrink-0 text-primary transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <p className="max-w-3xl pb-5 text-sm leading-7 text-muted-foreground">
                          {t('questions.' + id + '.a')}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <Search
                size={28}
                aria-hidden="true"
                className="mx-auto mb-4 text-primary"
              />
              <h2 className="text-xl font-semibold">{t('noResults')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('noResultsText')}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={clear}
                className="mt-5 min-h-11"
              >
                {t('clear')}
              </Button>
            </div>
          )}
          <div className="mt-10 flex flex-col gap-4 border-t pt-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{t('ctaTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('ctaText')}
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/#trip-search-title">{t('cta')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
