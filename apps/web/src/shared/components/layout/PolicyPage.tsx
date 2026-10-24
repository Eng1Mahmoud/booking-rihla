import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type PolicySection = { id: string; title: string; paragraphs: string[] };

export async function PolicyPage({ policy }: { policy: 'Terms' | 'Privacy' }) {
  const [t, common] = await Promise.all([
    getTranslations(policy),
    getTranslations('Policy'),
  ]);
  const sections = t.raw('sections') as PolicySection[];
  const contents = (
    <ol className="space-y-1">
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={'#' + section.id}
            className="flex min-h-11 items-center gap-3 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <span aria-hidden="true" className="text-primary/70">
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <header className="border-b bg-secondary/60">
        <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-9 md:py-12">
          <p className="text-sm font-medium text-primary">
            {common('eyebrow')}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-relaxed tracking-tight md:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
            {t('intro')}
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            {common('updated')}{' '}
            <time dateTime="2026-10-24">{common('updatedDate')}</time>
          </p>
          <nav
            aria-label={common('navigation')}
            className="mt-5 flex flex-wrap gap-x-6 gap-y-1"
          >
            {[
              { href: '/terms', key: 'Terms' },
              { href: '/privacy', key: 'Privacy' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={policy === item.key ? 'page' : undefined}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary"
              >
                {common(item.key)}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1180px] gap-8 py-8 md:py-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label={common('contents')} className="sticky top-28">
            <h2 className="mb-3 text-sm font-semibold">{common('contents')}</h2>
            {contents}
          </nav>
        </aside>
        <div className="min-w-0 max-w-3xl">
          <aside
            role="note"
            className="border-s-4 border-primary bg-secondary/70 px-5 py-4"
          >
            <h2 className="text-base font-semibold">{common('draftTitle')}</h2>
            <p className="mt-2 text-sm leading-8 text-muted-foreground">
              {common('draftText')}
            </p>
          </aside>
          <details className="mt-6 border-b pb-4 lg:hidden">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary">
              {common('contents')}
            </summary>
            <nav aria-label={common('contents')} className="pt-2">
              {contents}
            </nav>
          </details>
          <article aria-label={t('title')} className="divide-y">
            {sections.map((section) => (
              <section
                key={section.id}
                aria-labelledby={section.id}
                className="py-7 md:py-9"
              >
                <h2
                  id={section.id}
                  tabIndex={-1}
                  className="scroll-mt-28 text-xl font-semibold leading-relaxed"
                >
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-8 text-muted-foreground md:text-base md:leading-8">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {policy === 'Privacy' && section.id === 'providers' ? (
                    <a
                      href="https://paymob.com/en/policy"
                      className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                    >
                      {t('providerPolicy')}
                    </a>
                  ) : null}
                </div>
              </section>
            ))}
          </article>
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-5">
            <Link
              href="/faqs"
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
            >
              {common('faqs')}
            </Link>
            <a
              href="#top"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
            >
              {common('backToTop')}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
