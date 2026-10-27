'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    results: {
      [i: number]: { [j: number]: { transcript: string }; isFinal: boolean };
    };
  }) => void) | null;
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
    ref.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('unsupported');
      return;
    }
    setError(null);
    setTranscript('');
    const recognition = new Ctor();
    recognition.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; event.results[i]; i++) {
        text += event.results[i][0]?.transcript ?? '';
      }
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      setError(event.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    ref.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('start_failed');
      setListening(false);
    }
  }, [locale]);

  useEffect(() => () => ref.current?.abort(), []);

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    setTranscript,
  };
}

function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/** Prefer OS-local voices — remote Google voices hit Chrome's 15s cutoff. */
function pickVoice(locale: 'ar' | 'en'): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;

  const prefix = locale === 'ar' ? 'ar' : 'en';
  const matching = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix),
  );
  if (matching.length === 0) return null;

  const local = matching.find((v) => v.localService);
  if (local) return local;

  const preferred =
    locale === 'ar'
      ? ['ar-EG', 'ar-SA', 'ar-AE', 'ar-XA', 'ar']
      : ['en-US', 'en-GB', 'en'];
  for (const code of preferred) {
    const hit = matching.find(
      (v) => v.lang.toLowerCase() === code.toLowerCase(),
    );
    if (hit) return hit;
  }
  return matching[0] ?? null;
}

function prepareForSpeech(text: string, locale: 'ar' | 'en'): string {
  let t = text.replace(/\s+/g, ' ').trim();

  if (locale === 'ar') {
    t = t
      .replace(/\b1\s*[.)\-:]\s*/g, 'أولاً، ')
      .replace(/\b2\s*[.)\-:]\s*/g, 'ثانياً، ')
      .replace(/\b3\s*[.)\-:]\s*/g, 'ثالثاً، ')
      .replace(/\b4\s*[.)\-:]\s*/g, 'رابعاً، ')
      .replace(/\b5\s*[.)\-:]\s*/g, 'خامساً، ')
      .replace(/\b(\d+)\s*[.)\-:]\s*/g, '، ');
  } else {
    t = t
      .replace(/\b1\s*[.)\-:]\s*/g, 'First, ')
      .replace(/\b2\s*[.)\-:]\s*/g, 'Second, ')
      .replace(/\b3\s*[.)\-:]\s*/g, 'Third, ')
      .replace(/\b4\s*[.)\-:]\s*/g, 'Fourth, ')
      .replace(/\b5\s*[.)\-:]\s*/g, 'Fifth, ')
      .replace(/\b(\d+)\s*[.)\-:]\s*/g, ', ');
  }

  // Keep spoken replies short for reliability
  return t.slice(0, 800);
}

function chunkText(text: string): string[] {
  const max = 100;
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= max) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, max + 1);
    const breakAt = Math.max(
      slice.lastIndexOf('.'),
      slice.lastIndexOf('!'),
      slice.lastIndexOf('?'),
      slice.lastIndexOf('؟'),
      slice.lastIndexOf('،'),
      slice.lastIndexOf(','),
      slice.lastIndexOf(' '),
    );
    const end = breakAt > 30 ? breakAt + 1 : max;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  return chunks.filter(Boolean);
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [hasArabicVoice, setHasArabicVoice] = useState(false);
  const [hasEnglishVoice, setHasEnglishVoice] = useState(false);
  const stoppedRef = useRef(false);
  const keepAliveRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const load = () => {
      const voices = listVoices();
      if (voices.length === 0) return;
      setVoicesReady(true);
      setHasArabicVoice(voices.some((v) => v.lang.toLowerCase().startsWith('ar')));
      setHasEnglishVoice(voices.some((v) => v.lang.toLowerCase().startsWith('en')));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const t = window.setTimeout(load, 400);

    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (keepAliveRef.current) window.clearInterval(keepAliveRef.current);
    };
  }, []);

  const canSpeakForLocale = useCallback(
    (locale: 'ar' | 'en') => {
      if (!supported || !voicesReady) return false;
      return locale === 'ar' ? hasArabicVoice : hasEnglishVoice;
    },
    [supported, voicesReady, hasArabicVoice, hasEnglishVoice],
  );

  const clearKeepAlive = () => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearKeepAlive();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, locale: 'ar' | 'en') => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        !text.trim()
      ) {
        return false;
      }

      const voice = pickVoice(locale);
      if (!voice) return false;

      const synth = window.speechSynthesis;
      stoppedRef.current = false;
      synth.cancel();
      clearKeepAlive();

      const chunks = chunkText(prepareForSpeech(text, locale));
      if (chunks.length === 0) return false;

      const lang = voice.lang || (locale === 'ar' ? 'ar-SA' : 'en-US');
      setSpeaking(true);

      keepAliveRef.current = window.setInterval(() => {
        if (stoppedRef.current || !synth.speaking) {
          clearKeepAlive();
          return;
        }
        try {
          synth.pause();
          synth.resume();
        } catch {
          /* ignore */
        }
      }, 9000);

      const speakAt = (index: number) => {
        if (stoppedRef.current || index >= chunks.length) {
          clearKeepAlive();
          setSpeaking(false);
          return;
        }

        const utter = new SpeechSynthesisUtterance(chunks[index]!);
        utter.lang = lang;
        utter.rate = locale === 'ar' ? 0.9 : 1;
        utter.voice = voice;

        const next = () => {
          if (stoppedRef.current) {
            clearKeepAlive();
            setSpeaking(false);
            return;
          }
          window.setTimeout(() => speakAt(index + 1), 50);
        };

        utter.onend = next;
        utter.onerror = next;

        window.setTimeout(() => {
          if (stoppedRef.current) return;
          synth.speak(utter);
        }, 0);
      };

      speakAt(0);
      return true;
    },
    [],
  );

  return {
    supported,
    speaking,
    speak,
    stop,
    voicesReady,
    canSpeakForLocale,
  };
}
