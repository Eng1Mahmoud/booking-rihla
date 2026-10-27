'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: {
          [i: number]: {
            [j: number]: { transcript: string };
            isFinal: boolean;
          };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function discardRecognition(recognition: SpeechRecognitionLike | null) {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort();
  } catch {
    /* Already stopped. */
  }
}

/** Browser speech-to-text for user input only (no TTS). */
export function useSpeechToText(locale: 'ar' | 'en') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    try {
      ref.current?.stop();
    } catch {
      discardRecognition(ref.current);
      ref.current = null;
    }
    setListening(false);
  }, []);

  const cancel = useCallback(() => {
    const current = ref.current;
    ref.current = null;
    discardRecognition(current);
    setListening(false);
    setTranscript('');
    setError(null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('unsupported');
      return;
    }
    cancel();
    const recognition = new Ctor();
    recognition.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      if (ref.current !== recognition) return;
      let text = '';
      for (let i = 0; event.results[i]; i++) {
        text += event.results[i][0]?.transcript ?? '';
      }
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      if (ref.current !== recognition) return;
      if (event.error !== 'aborted') setError(event.error);
      setListening(false);
    };
    recognition.onend = () => {
      if (ref.current !== recognition) return;
      ref.current = null;
      setListening(false);
    };
    ref.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      discardRecognition(ref.current);
      ref.current = null;
      setError('start_failed');
      setListening(false);
    }
  }, [locale, cancel]);

  useEffect(
    () => () => {
      const current = ref.current;
      ref.current = null;
      discardRecognition(current);
    },
    [],
  );

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    cancel,
    setTranscript,
  };
}
