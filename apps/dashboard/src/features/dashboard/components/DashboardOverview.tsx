import { Armchair, BusFront, Database, Ticket } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { cn, type ApiResult } from '@/shared/lib';
import { RefreshPage } from '@/shared/components/feedback';
import type { OperationReport, PaymentReport } from '../types/report';
import { formatGrossPaid } from '../lib/format';
type Row = { label: string; value: number; tone?: string };
function MetricList({
  rows,
  locale,
  compact = false,
}: {
  rows: Row[];
  locale: string;
  compact?: boolean;
}) {
  const format = new Intl.NumberFormat(locale);
  return (
    <dl>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex items-center justify-between gap-3 border-b last:border-b-0',
            compact ? 'min-h-9' : 'min-h-12',
          )}
        >
          <dt className="flex min-w-0 items-center gap-[13px] text-muted-foreground">
            {row.tone && (
              <span
                aria-hidden="true"
                className={cn('size-[13px] shrink-0 rounded-full', row.tone)}
              />
            )}
            {row.label}
          </dt>
          <dd
            className={cn(
              'font-bold text-secondary-foreground tabular-nums',
              compact ? 'text-[20px]' : 'text-[28px]',
            )}
          >
            {format.format(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export async function DashboardOverview({
  operations,
  payments,
}: {
  operations: ApiResult<OperationReport>;
  payments: ApiResult<PaymentReport>;
}) {
  const t = await getTranslations('Dashboard');
  const locale = await getLocale();
  const format = new Intl.NumberFormat(locale);
  const report = operations.success ? operations.data : undefined;
  const payment = payments.success ? payments.data : undefined;
  return (
    <>
      <section id="operations" aria-label={t('operations')}>
        {report ? (
          <>
            {report.trips.total === 0 && (
              <p
                role="status"
                className="mb-4 rounded-xl border bg-card p-4 text-sm"
              >
                {t('noTrips')}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              <section
                className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px] xl:min-h-[374px]"
                aria-labelledby="trips-title"
              >
                <div className="mb-3 flex items-center gap-4 sm:gap-[22px]">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#edf8f8] text-primary sm:size-18">
                    <BusFront className="size-[30px]" aria-hidden="true" />
                  </span>
                  <h2
                    id="trips-title"
                    className="text-[clamp(21px,1.7vw,27px)] leading-[1.3] font-bold"
                  >
                    {t('trips')}
                  </h2>
                </div>
                <MetricList
                  locale={locale}
                  rows={[
                    { label: t('total'), value: report.trips.total },
                    {
                      label: t('upcoming'),
                      value: report.trips.upcoming,
                      tone: 'bg-primary',
                    },
                    {
                      label: t('departed'),
                      value: report.trips.departed,
                      tone: 'bg-[#4593d7]',
                    },
                    {
                      label: t('cancelled'),
                      value: report.trips.cancelled,
                      tone: 'bg-[#df5366]',
                    },
                  ]}
                />
              </section>
              <section
                className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px] xl:min-h-[374px]"
                aria-labelledby="bookings-title"
              >
                <div className="mb-3 flex items-center gap-4 sm:gap-[22px]">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#edf8f8] text-primary sm:size-18">
                    <Ticket className="size-[30px]" aria-hidden="true" />
                  </span>
                  <h2
                    id="bookings-title"
                    className="text-[clamp(21px,1.7vw,27px)] leading-[1.3] font-bold"
                  >
                    {t('bookings')}
                  </h2>
                </div>
                <MetricList
                  locale={locale}
                  rows={[
                    { label: t('total'), value: report.bookings.total },
                    {
                      label: t('confirmed'),
                      value: report.bookings.confirmed,
                      tone: 'bg-[#12a96a]',
                    },
                    {
                      label: t('awaiting'),
                      value: report.bookings.pendingPayment,
                      tone: 'bg-[#e9a02c]',
                    },
                    {
                      label: t('expired'),
                      value: report.bookings.expired,
                      tone: 'bg-[#94a3b3]',
                    },
                    {
                      label: t('cancelled'),
                      value: report.bookings.cancelled,
                      tone: 'bg-[#df5366]',
                    },
                    ...(report.bookings.reserved
                      ? [
                          {
                            label: t('reserved'),
                            value: report.bookings.reserved,
                            tone: 'bg-primary',
                          },
                        ]
                      : []),
                    ...(report.bookings.paymentProcessing
                      ? [
                          {
                            label: t('processing'),
                            value: report.bookings.paymentProcessing,
                            tone: 'bg-[#e9a02c]',
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
              <section
                className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px] md:max-xl:col-span-full md:max-xl:grid md:max-xl:grid-cols-2 md:max-xl:items-center md:max-xl:gap-x-8 md:max-xl:gap-y-4 xl:min-h-[374px]"
                aria-labelledby="seats-title"
              >
                <div className="mb-3 flex items-center gap-4 sm:gap-[22px] md:max-xl:mb-0">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#edf8f8] text-primary sm:size-18">
                    <Armchair className="size-[30px]" aria-hidden="true" />
                  </span>
                  <h2
                    id="seats-title"
                    className="text-[clamp(21px,1.7vw,27px)] leading-[1.3] font-bold"
                  >
                    {t('allocation')}
                  </h2>
                </div>
                <div className="mt-[18px] flex items-center justify-between gap-[22px] md:max-xl:col-start-2 md:max-xl:row-span-2 md:max-xl:row-start-1 md:max-xl:mt-0">
                  <div
                    className="relative aspect-square w-[150px] max-w-[53%] shrink-0 sm:w-40"
                    role="img"
                    aria-label={t('occupancy', {
                      percent: report.seats.occupancyPercent,
                    })}
                  >
                    <svg
                      className="block size-full"
                      viewBox="0 0 120 120"
                      aria-hidden="true"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="11"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="var(--ocean)"
                        strokeWidth="11"
                        strokeLinecap={
                          report.seats.occupancyPercent ? 'round' : 'butt'
                        }
                        pathLength="100"
                        strokeDasharray={report.seats.occupancyPercent + ' 100'}
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <strong className="absolute inset-0 flex items-center justify-center text-[clamp(24px,2vw,34px)] text-secondary-foreground">
                      {new Intl.NumberFormat(locale, {
                        style: 'percent',
                        maximumFractionDigits: 2,
                      }).format(report.seats.occupancyPercent / 100)}
                    </strong>
                  </div>
                  <dl className="grid min-w-0 gap-5">
                    <div>
                      <dd className="text-[28px] leading-[1.3] font-bold text-secondary-foreground tabular-nums">
                        {format.format(report.seats.occupied)}
                      </dd>
                      <dt className="text-sm/normal text-muted-foreground">
                        {t('allocatedOf', { count: report.seats.total })}
                      </dt>
                    </div>
                    <div>
                      <dd className="text-[28px] leading-[1.3] font-bold text-secondary-foreground tabular-nums">
                        {format.format(report.seats.available)}
                      </dd>
                      <dt className="text-sm/normal text-muted-foreground">
                        {t('available')}
                      </dt>
                    </div>
                  </dl>
                </div>
                <p className="mt-[30px] text-[14px] text-muted-foreground md:max-xl:col-start-1 md:max-xl:mt-0">
                  {t('holdsNote')}
                </p>
              </section>
            </div>
          </>
        ) : (
          <div
            className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px]"
            role="alert"
          >
            <h2 className="text-xl font-semibold">
              {t('operationsUnavailable')}
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              {t('retryHint')}
            </p>
            <RefreshPage label={t('refresh')} />
          </div>
        )}
      </section>
      <section
        id="payments"
        className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px] mt-4"
        aria-labelledby="payments-title"
      >
        {payment ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center gap-4 sm:gap-[22px]">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#edf8f8] text-primary sm:size-18">
                    <Database className="size-[30px]" aria-hidden="true" />
                  </span>
                  <h2
                    id="payments-title"
                    className="text-[clamp(21px,1.7vw,27px)] leading-[1.3] font-bold"
                  >
                    {t('paymentOutcomes')}
                  </h2>
                </div>
                <p className="text-[clamp(27px,2.65vw,42px)] leading-[1.4] font-bold wrap-anywhere text-secondary-foreground sm:ms-[94px]">
                  <bdi>
                    {formatGrossPaid(payment.paid.amountPiastres, locale)}
                  </bdi>
                </p>
                <p className="text-[18px] text-muted-foreground sm:ms-[94px]">
                  {t('grossPaid')}
                </p>
              </div>
              <div className="md:border-s md:ps-12">
                <MetricList
                  compact
                  locale={locale}
                  rows={[
                    {
                      label: t('paid'),
                      value: payment.settlements.paid,
                      tone: 'bg-[#12a96a]',
                    },
                    {
                      label: t('requested'),
                      value: payment.settlements.requested,
                      tone: 'bg-[#e9a02c]',
                    },
                    {
                      label: t('unknown'),
                      value: payment.settlements.unknown,
                      tone: 'bg-[#94a3b3]',
                    },
                    {
                      label: t('needsReview'),
                      value: payment.settlements.requiresReview,
                      tone: 'bg-[#df5366]',
                    },
                    {
                      label: t('refundRequired'),
                      value: payment.settlements.refundRequired,
                      tone: 'bg-[#df5366]',
                    },
                  ]}
                />
              </div>
            </div>
            {payment.settlements.total === 0 && (
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {t('noPayments')}
              </p>
            )}
            {process.env.DASHBOARD_PREVIEW === 'synthetic' && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t('demoData')}
              </p>
            )}
          </>
        ) : (
          <div role="alert">
            <h2 id="payments-title" className="text-xl font-semibold">
              {t('paymentsUnavailable')}
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              {t('retryHint')}
            </p>
            <RefreshPage label={t('refresh')} />
          </div>
        )}
      </section>
    </>
  );
}
