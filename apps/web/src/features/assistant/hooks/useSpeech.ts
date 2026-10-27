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

function pickVoice(locale: 'ar' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred =
    locale === 'ar'
      ? ['ar-EG', 'ar-SA', 'ar-AE', 'ar-XA', 'ar']
      : ['en-US', 'en-GB', 'en'];

  for (const code of preferred) {
    const exact = voices.find(
      (v) => v.lang.toLowerCase() === code.toLowerCase(),
    );
    if (exact) return exact;
  }

  const prefix = locale === 'ar' ? 'ar' : 'en';
  const byPrefix = voices.find((v) =>
    v.lang.toLowerCase().startsWith(prefix),
  );
  if (byPrefix) return byPrefix;

  return voices[0] ?? null;
}

/** Prepare text so TTS does not choke on list numbers / long runs. */
function prepareForSpeech(text: string, locale: 'ar' | 'en'): string {
  let t = text.replace(/\s+/g, ' ').trim();

  // "1. step" / "2-" style markers confuse engines and often stop playback
  if (locale === 'ar') {
    t = t
      .replace(/\b1\s*[.)\-:]\s*/g, 'أولاً، ')
      .replace(/\b2\s*[.)\-:]\s*/g, 'ثانياً، ')
      .replace(/\b3\s*[.)\-:]\s*/g, 'ثالثاً، ')
      .replace(/\b4\s*[.)\-:]\s*/g, 'رابعاً، ')
      .replace(/\b5\s*[.)\-:]\s*/g, 'خامساً، ')
      .replace(/\b(\d+)\s*[.)\-:]\s*/g, 'النقطة $1، ');
  } else {
    t = t
      .replace(/\b1\s*[.)\-:]\s*/g, 'First, ')
      .replace(/\b2\s*[.)\-:]\s*/g, 'Second, ')
      .replace(/\b3\s*[.)\-:]\s*/g, 'Third, ')
      .replace(/\b4\s*[.)\-:]\s*/g, 'Fourth, ')
      .replace(/\b5\s*[.)\-:]\s*/g, 'Fifth, ')
      .replace(/\b(\d+)\s*[.)\-:]\s*/g, 'Point $1, ');
  }

  return t.slice(0, 1200);
}

/** Split into short chunks — Chrome drops long single utterances. */
function chunkText(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?؟،；;])\s+|(?<=\n)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return text ? [text] : [];

  // Merge tiny fragments; keep each chunk under ~180 chars
  const chunks: string[] = [];
  let buf = '';
  for (const part of parts) {
    if (!buf) {
      buf = part;
      continue;
    }
    if (buf.length + 1 + part.length <= 180) {
      buf = `${buf} ${part}`;
    } else {
      chunks.push(buf);
      buf = part;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const stoppedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

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
    const t = window.setTimeout(load, 250);

    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (resumeTimerRef.current) {
        window.clearInterval(resumeTimerRef.current);
      }
    };
  }, []);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      window.clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearResumeTimer();
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

      stoppedRef.current = false;
      window.speechSynthesis.cancel();
      clearResumeTimer();

      const prepared = prepareForSpeech(text, locale);
      const chunks = chunkText(prepared);
      if (chunks.length === 0) return;

      const voice = pickVoice(locale);
      const lang = voice?.lang || (locale === 'ar' ? 'ar-EG' : 'en-US');

      setSpeaking(true);

      // Keep Chromium from freezing mid-speech
      resumeTimerRef.current = window.setInterval(() => {
        if (stoppedRef.current || !window.speechSynthesis.speaking) {
          clearResumeTimer();
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 4000);

      const speakChunk = (index: number) => {
        if (stoppedRef.current || index >= chunks.length) {
          clearResumeTimer();
          setSpeaking(false);
          return;
        }

        const utter = new SpeechSynthesisUtterance(chunks[index]);
        utter.lang = lang;
        utter.rate = locale === 'ar' ? 0.92 : 1;
        utter.pitch = 1;
        utter.volume = 1;
        if (voice) utter.voice = voice;

        utter.onend = () => {
          if (stoppedRef.current) {
            clearResumeTimer();
            setSpeaking(false);
            return;
          }
          // Small gap between chunks helps stability
          window.setTimeout(() => speakChunk(index + 1), 80);
        };
        utter.onerror = () => {
          // Skip broken chunk and continue rather than stopping entirely
          if (stoppedRef.current) {
            clearResumeTimer();
            setSpeaking(false);
            return;
          }
          window.setTimeout(() => speakChunk(index + 1), 80);
        };

        window.speechSynthesis.speak(utter);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      };

      const start = () => speakChunk(0);
      if (!voicesReady || window.speechSynthesis.getVoices().length === 0) {
        window.setTimeout(start, 200);
      } else {
        start();
      }
    },
    [voicesReady],
  );

  return { supported, speaking, speak, stop, voicesReady };
}
