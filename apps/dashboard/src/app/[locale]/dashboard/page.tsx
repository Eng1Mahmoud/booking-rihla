import { getTranslations } from 'next-intl/server';
import { DateFilter } from '@/features/dashboard/components/DateFilter';
import { cairoToday } from '@/features/dashboard/lib/format';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { getDashboardReports } from '@/features/dashboard/lib/reports.server';
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const t = await getTranslations('Dashboard');
  const params = await searchParams;
  const date =
    (Array.isArray(params.date) ? params.date[0] : params.date) ?? cairoToday();
  const reports = await getDashboardReports(date);
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
          <DateFilter date={date} />
        </div>
      </div>
      <DashboardOverview {...reports} />
    </div>
  );
}
