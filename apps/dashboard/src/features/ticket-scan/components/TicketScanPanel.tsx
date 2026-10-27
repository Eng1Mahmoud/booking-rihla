'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { scanTicketAction, type ScanTicketResult } from '../actions/scan.actions';
import { cn } from '@/shared/lib/cn';

type Detector = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue?: string }[]>;
};

const copy = {
  en: {
    ticketScan: 'Ticket scan',
    scanTitle: 'Scan boarding QR',
    scanHint: 'Point the camera at the passenger QR, or paste the code.',
    startCamera: 'Start camera',
    stopCamera: 'Stop camera',
    manualPayload: 'Or paste QR payload',
    verify: 'Verify',
    board: 'Confirm boarding',
    scanResult: 'Result',
    cameraUnsupported:
      'Camera QR scanning is not available on this device. Paste the payload instead.',
    scanning: 'Scanning…',
    passenger: 'Passenger',
    trip: 'Trip',
    departure: 'Departure',
    boarded: 'Boarded',
  },
  ar: {
    ticketScan: 'مسح التذاكر',
    scanTitle: 'مسح QR للصعود',
    scanHint: 'وجّه الكاميرا إلى رمز الراكب، أو الصق الرمز يدويًا.',
    startCamera: 'تشغيل الكاميرا',
    stopCamera: 'إيقاف الكاميرا',
    manualPayload: 'أو الصق محتوى الـ QR',
    verify: 'تحقق',
    board: 'تأكيد الصعود',
    scanResult: 'النتيجة',
    cameraUnsupported:
      'مسح الكاميرا غير متاح على هذا الجهاز. الصق الرمز يدويًا.',
    scanning: 'جاري المسح…',
    passenger: 'الراكب',
    trip: 'الرحلة',
    departure: 'المغادرة',
    boarded: 'تم الصعود',
  },
} as const;

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
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useMemo(() => copy[locale], [locale]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanTicketResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPayload = useRef('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    const detector = getDetector();
    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      setError(t.cameraUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraSupported(false);
      setError(t.cameraUnsupported);
    }
  }, [t]);

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
          setError(String(res.code ?? 'ERROR'));
          setResult(null);
          return;
        }
        setResult(res.data);
        lastPayload.current = value;
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
        <h1 className="text-2xl font-semibold tracking-tight">{t.scanTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.scanHint}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full bg-black object-cover"
          muted
          playsInline
        />
        <div className="flex flex-wrap gap-2 border-t p-3">
          {!cameraOn ? (
            <Button
              type="button"
              onClick={() => void startCamera()}
              disabled={!cameraSupported}
            >
              {t.startCamera}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={stopCamera}>
              {t.stopCamera}
            </Button>
          )}
          {busy && (
            <span className="text-sm text-muted-foreground">{t.scanning}</span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="qr-payload">
          {t.manualPayload}
        </label>
        <textarea
          id="qr-payload"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={3}
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
            {t.verify}
          </Button>
          <Button
            type="button"
            disabled={busy || !manual.trim()}
            onClick={() => void runScan(manual, 'board')}
          >
            {t.board}
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
            {t.scanResult}: {result.code}
          </p>
          {result.ticket && (
            <dl className="mt-3 grid gap-2">
              <div>
                <dt className="text-xs opacity-70">Ref</dt>
                <dd className="font-medium">{result.ticket.reference}</dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t.passenger}</dt>
                <dd className="font-medium">
                  {result.ticket.passenger.name} · seat{' '}
                  {result.ticket.passenger.seatNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t.trip}</dt>
                <dd>
                  {result.ticket.trip.origin} →{' '}
                  {result.ticket.trip.destination}
                </dd>
              </div>
              <div>
                <dt className="text-xs opacity-70">{t.departure}</dt>
                <dd>
                  {new Date(result.ticket.trip.departureAt).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </dd>
              </div>
              {result.boardedAt && (
                <div>
                  <dt className="text-xs opacity-70">{t.boarded}</dt>
                  <dd>
                    {new Date(result.boardedAt).toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
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
