'use client';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { useTicketScan } from '../hooks/useTicketScan';

export function TicketScanPanel() {
  const {
    t,
    locale,
    videoRef,
    cameraStarting,
    cameraOn,
    cameraSupported,
    manual,
    setManual,
    busy,
    result,
    error,
    startCamera,
    stopCamera,
    runScan,
  } = useTicketScan();
  const statusColor =
    result?.code === 'OK'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800'
      : result?.code === 'ALREADY_BOARDED'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
        : result
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : '';

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('scanTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('scanHint')}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full bg-black object-cover"
          muted
          playsInline
        />
        <div className="flex flex-wrap gap-2 border-t p-3">
          {!cameraOn && !cameraStarting ? (
            <Button
              type="button"
              onClick={() => void startCamera()}
              disabled={!cameraSupported}
            >
              {t('startCamera')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={stopCamera}>
              {t('stopCamera')}
            </Button>
          )}
          {busy && (
            <span className="text-sm text-muted-foreground">
              {t('scanning')}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="qr-payload">
          {t('manualPayload')}
        </label>
        <textarea
          id="qr-payload"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={3}
          maxLength={2048}
          className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm"
          dir="ltr"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !manual.trim()}
            onClick={() => void runScan(manual, 'verify')}
          >
            {t('verify')}
          </Button>
          <Button
            type="button"
            disabled={busy || !manual.trim()}
            onClick={() => void runScan(manual, 'board')}
          >
            {t('board')}
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {result && (
        <div className={cn('rounded-2xl border p-4 text-sm', statusColor)}>
          <p className="font-semibold">
            {t('scanResult')}:{' '}
            {t(
              result.code === 'OK' && result.action === 'board'
                ? 'boardedSuccess'
                : 'results.' + result.code,
            )}
          </p>
          {result.ticket && (
            <dl className="mt-3 grid gap-2">
              <div>
                <dt className="text-xs opacity-70">{t('scanReference')}</dt>
                <dd className="font-medium">{result.ticket.reference}</dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t('scanPassenger')}</dt>
                <dd className="font-medium">
                  {result.ticket.passenger.name} ·{' '}
                  {t('scanSeat', {
                    number: result.ticket.passenger.seatNumber,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t('scanTrip')}</dt>
                <dd>
                  {result.ticket.trip.origin} → {result.ticket.trip.destination}
                </dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t('scanDeparture')}</dt>
                <dd>
                  {new Date(result.ticket.trip.departureAt).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                    { timeZone: 'Africa/Cairo' },
                  )}
                </dd>
              </div>
              {result.boardedAt && (
                <div>
                  <dt className="text-xs opacity-70">{t('scanBoarded')}</dt>
                  <dd>
                    {new Date(result.boardedAt).toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
                      { timeZone: 'Africa/Cairo' },
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
