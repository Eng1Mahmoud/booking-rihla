import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { DateFilter, reportDateSchema, cairoToday } from '@/features/dashboard';
import {
  DashboardOverview,
  getDashboardReports,
} from '@/features/dashboard/server';
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const t = await getTranslations('Dashboard');
  const params = await searchParams;
  const parsed = reportDateSchema.safeParse(params.date ?? cairoToday());
  if (!parsed.success)
    return (
      <section
        className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px]"
        role="alert"
      >
        <h1 className="text-2xl font-semibold">{t('invalidDate')}</h1>
        <p className="my-4">{t('invalidDateHint')}</p>
        <Link
          href="/dashboard"
          className="text-primary underline underline-offset-4"
        >
          {t('today')}
        </Link>
      </section>
    );
  const reports = await getDashboardReports(parsed.data);
  return (
    <div id="overview">
      <div className="mb-6 flex flex-col gap-6 lg:min-h-32 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 lg:self-center">
          <h1 className="text-[clamp(30px,3vw,47px)] leading-[1.2] font-bold tracking-[-0.025em] text-balance [[lang=en]_&]:font-display">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-[65ch] text-[16px] text-muted-foreground">
            {t('intro')}
          </p>
        </div>
        <div className="lg:w-2/5 lg:min-w-[330px]">
          <DateFilter date={parsed.data} />
        </div>
      </div>
      <DashboardOverview {...reports} />
    </div>
  );
}
