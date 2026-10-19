import { getTranslations } from 'next-intl/server';
export async function SiteFooter() {
  const t = await getTranslations('Footer');
  return (
    <footer className="site-footer">
      <div className="container-shell footer-inner">
        <span className="footer-brand">Rihla.</span>
        <p>{t('note')}</p>
        <a
          href="https://unsplash.com/photos/hx83ehBDWRE"
          target="_blank"
          rel="noreferrer"
        >
          {t('photo')}
        </a>
      </div>
    </footer>
  );
}
