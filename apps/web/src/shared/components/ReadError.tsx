import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RefreshPage } from './RefreshPage';

export async function ReadError({
  message,
  title,
  children,
  autoRefresh = false,
}: {
  message: string;
  title?: string;
  children?: ReactNode;
  autoRefresh?: boolean;
}) {
  const t = await getTranslations('Auth');
  return (
    <section className="panel result-entry" role="alert">
      {title && <h1>{title}</h1>}
      <p>{message}</p>
      <RefreshPage label={t('retrySession')} autoRefresh={autoRefresh} />
      {children}
    </section>
  );
}
