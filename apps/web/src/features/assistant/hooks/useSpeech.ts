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

  // Last resort: any voice (better than silence)
  return voices[0] ?? null;
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoicesReady(true);
    };

    load();
    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = load;
    // Some browsers need a second tick
    const t = window.setTimeout(load, 250);

    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utterRef.current = null;
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

      // Cancel any current speech first
      window.speechSynthesis.cancel();

      const cleaned = text
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);

      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
      utter.rate = locale === 'ar' ? 0.95 : 1;
      utter.pitch = 1;
      utter.volume = 1;

      const voice = pickVoice(locale);
      if (voice) {
        utter.voice = voice;
        // Align lang with the chosen voice when possible
        if (voice.lang) utter.lang = voice.lang;
      }

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        utterRef.current = null;
        setSpeaking(false);
      };
      utter.onerror = () => {
        utterRef.current = null;
        setSpeaking(false);
      };

      utterRef.current = utter;

      // Chrome bug: synthesis can stay in paused state after cancel
      const kick = () => {
        window.speechSynthesis.speak(utter);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      };

      // If voices not ready yet, wait briefly then speak
      if (!voicesReady || window.speechSynthesis.getVoices().length === 0) {
        window.setTimeout(kick, 150);
      } else {
        kick();
      }

      // Safety: some Chromium builds pause after ~15s; resume periodically
      const resumeTimer = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          window.clearInterval(resumeTimer);
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 5000);

      utter.onend = () => {
        window.clearInterval(resumeTimer);
        utterRef.current = null;
        setSpeaking(false);
      };
    },
    [voicesReady],
  );

  return { supported, speaking, speak, stop, voicesReady };
}
