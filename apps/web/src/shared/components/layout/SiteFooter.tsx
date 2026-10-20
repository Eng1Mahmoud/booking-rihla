import { getTranslations } from 'next-intl/server';
export async function SiteFooter() {
  const t = await getTranslations('Footer');
  return (
    <footer className="border-t bg-secondary/50">
      <div className="mx-auto flex w-[calc(100%-2rem)] max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-xs text-muted-foreground">
        <span dir="ltr" className="text-xl font-semibold text-foreground">
          Rihla.
        </span>
        <p className="order-3 w-full md:order-none md:w-auto">{t('note')}</p>
        <a
          href="https://unsplash.com/photos/hx83ehBDWRE"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {t('photo')}
        </a>
      </div>
    </footer>
  );
}
