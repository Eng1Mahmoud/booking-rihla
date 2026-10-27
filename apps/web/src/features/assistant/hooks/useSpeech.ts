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

/** Prefer OS-local voices — remote Google voices hit Chrome's 15s cutoff. */
function pickVoice(locale: 'ar' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const prefix = locale === 'ar' ? 'ar' : 'en';
  const matching = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix),
  );
  const pool = matching.length > 0 ? matching : voices;

  // 1) Local Arabic/English voice
  const local = pool.find((v) => v.localService);
  if (local) return local;

  // 2) Preferred locale codes
  const preferred =
    locale === 'ar'
      ? ['ar-EG', 'ar-SA', 'ar-AE', 'ar-XA', 'ar']
      : ['en-US', 'en-GB', 'en'];
  for (const code of preferred) {
    const hit = pool.find((v) => v.lang.toLowerCase() === code.toLowerCase());
    if (hit) return hit;
  }

  return pool[0] ?? null;
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

  return t.slice(0, 1500);
}

/** ~120 char chunks at punctuation — known stable size for Chrome. */
function chunkText(text: string): string[] {
  const max = 120;
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= max) {
      chunks.push(remaining);
      break;
    }
    let slice = remaining.slice(0, max + 1);
    // Prefer break after Arabic/Latin punctuation or space
    const breakAt = Math.max(
      slice.lastIndexOf('。'),
      slice.lastIndexOf('.'),
      slice.lastIndexOf('!'),
      slice.lastIndexOf('?'),
      slice.lastIndexOf('؟'),
      slice.lastIndexOf('،'),
      slice.lastIndexOf(','),
      slice.lastIndexOf(';'),
      slice.lastIndexOf('؛'),
      slice.lastIndexOf(' '),
    );
    const end = breakAt > 40 ? breakAt + 1 : max;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  return chunks.filter(Boolean);
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const stoppedRef = useRef(false);
  const keepAliveRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const load = () => {
      if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const t = window.setTimeout(load, 300);

    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (keepAliveRef.current) window.clearInterval(keepAliveRef.current);
    };
  }, []);

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
        return;
      }

      const synth = window.speechSynthesis;
      stoppedRef.current = false;
      synth.cancel();
      clearKeepAlive();

      const prepared = prepareForSpeech(text, locale);
      const chunks = chunkText(prepared);
      if (chunks.length === 0) return;

      // Warm up voices (Chrome often returns [] until spoken once)
      void synth.getVoices();

      const voice = pickVoice(locale);
      const lang = voice?.lang || (locale === 'ar' ? 'ar-SA' : 'en-US');

      setSpeaking(true);

      // Chromium bug: remote/Google voices stop ~15s without pause+resume
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
      }, 10000);

      const speakAt = (index: number) => {
        if (stoppedRef.current || index >= chunks.length) {
          clearKeepAlive();
          setSpeaking(false);
          return;
        }

        const utter = new SpeechSynthesisUtterance(chunks[index]!);
        utter.lang = lang;
        utter.rate = locale === 'ar' ? 0.9 : 1;
        utter.pitch = 1;
        utter.volume = 1;
        if (voice) utter.voice = voice;

        const next = () => {
          if (stoppedRef.current) {
            clearKeepAlive();
            setSpeaking(false);
            return;
          }
          window.setTimeout(() => speakAt(index + 1), 60);
        };

        utter.onend = next;
        utter.onerror = next;

        // Quirks that stabilize Chrome onend / ordering
        // eslint-disable-next-line no-console
        console.debug('[rihla-tts]', chunks[index]?.slice(0, 40));
        window.setTimeout(() => {
          if (stoppedRef.current) return;
          synth.speak(utter);
          if (synth.paused) {
            try {
              synth.resume();
            } catch {
              /* ignore */
            }
          }
        }, 0);
      };

      const begin = () => speakAt(0);
      if (!voicesReady || synth.getVoices().length === 0) {
        window.setTimeout(begin, 250);
      } else {
        begin();
      }
    },
    [voicesReady],
  );

  return { supported, speaking, speak, stop, voicesReady };
}
