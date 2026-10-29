'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  scanTicketAction,
  type ScanTicketResult,
} from '../actions/scan.actions';
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

export function useTicketScan() {
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
  return {
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
  };
}
