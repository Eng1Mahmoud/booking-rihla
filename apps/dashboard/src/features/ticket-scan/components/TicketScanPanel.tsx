'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import {
  scanTicketAction,
  type ScanTicketResult,
} from '../actions/scan.actions';
import { cn } from '@/shared/lib/cn';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';

type Detector = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
};

function getDetector(): Detector | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export function TicketScanPanel() {
  const t = useTranslations('TicketScan');
  const locale = useLocale() as 'ar' | 'en';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraGeneration = useRef(0);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanTicketResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPayload = useRef('');

  const stopCamera = useCallback(() => {
    cameraGeneration.current++;
    setCameraStarting(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    const generation = cameraGeneration.current;
    setCameraStarting(true);
    setError(null);
    const detector = getDetector();
    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      setError(t('cameraUnsupported'));
      setCameraStarting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (generation !== cameraGeneration.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (generation === cameraGeneration.current) setCameraOn(true);
    } catch {
      if (generation !== cameraGeneration.current) return;
      stopCamera();
      setCameraSupported(false);
      setError(t('cameraUnsupported'));
    } finally {
      if (generation === cameraGeneration.current) setCameraStarting(false);
    }
  }, [t, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const runScan = useCallback(
    async (payload: string, action: 'verify' | 'board') => {
      const value = payload.trim();
      if (!value || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await scanTicketAction({
          payload: value,
          action,
          language: locale,
        });
        if (!res.success || !res.data) {
          throw new ApiError(
            res.status,
            res.code,
            'message' in res ? res.message : undefined,
          );
        }
        setResult(res.data);
        lastPayload.current = value;
      } catch (error) {
        setError(errorMessage(error, locale));
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [busy, locale],
  );

  useEffect(() => {
    if (!cameraOn) return;
    const detector = getDetector();
    if (!detector || !videoRef.current) return;
    let active = true;
    const tick = async () => {
      if (!active || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const value = codes[0]?.rawValue?.trim();
        if (value && value !== lastPayload.current && !busy) {
          lastPayload.current = value;
          setManual(value);
          await runScan(value, 'verify');
        }
      } catch {
        /* frame skip */
      }
      if (active) window.setTimeout(() => void tick(), 500);
    };
    void tick();
    return () => {
      active = false;
    };
  }, [cameraOn, busy, runScan]);

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
