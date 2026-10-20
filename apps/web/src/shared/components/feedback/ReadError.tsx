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
    <section
      className="rounded-2xl border bg-card grid justify-items-start gap-[18px] p-7"
      role="alert"
    >
      {title && <h1>{title}</h1>}
      <p>{message}</p>
      <RefreshPage label={t('retrySession')} autoRefresh={autoRefresh} />
      {children}
    </section>
  );
}
