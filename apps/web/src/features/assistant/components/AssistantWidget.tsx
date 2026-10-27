'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  MessageCircle,
  X,
  Send,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { TripResultCard, type AssistantTrip } from './TripResultCard';
import { useSpeechToText, useTextToSpeech } from '../hooks/useSpeech';

const SUGGESTIONS_AR = [
  'فيه رحلات من القاهرة للإسكندرية بكرة؟',
  'إيه المدن المتاحة؟',
  'إزاي أحجز تذكرة؟',
];
const SUGGESTIONS_EN = [
  'Trips from Cairo to Alexandria tomorrow?',
  'Which cities are available?',
  'How do I book a ticket?',
];

function extractTripsFromParts(parts: unknown[]): AssistantTrip[] {
  const trips: AssistantTrip[] = [];
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    const p = part as {
      type?: string;
      output?: { trips?: AssistantTrip[] };
      result?: { trips?: AssistantTrip[] };
    };
    const out = p.output ?? p.result;
    if (out?.trips && Array.isArray(out.trips)) {
      for (const t of out.trips) {
        if (t?.id && t.tripPagePath?.startsWith('/trips/')) trips.push(t);
      }
    }
  }
  return trips;
}

function messageText(message: {
  parts?: { type: string; text?: string }[];
  content?: string;
}): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text!)
      .join('');
  }
  return typeof message.content === 'string' ? message.content : '';
}

export function AssistantWidget() {
  const locale = useLocale() as 'ar' | 'en';
  const isAr = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const speech = useSpeechToText(locale);
  const tts = useTextToSpeech();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant/chat',
        body: () => ({
          conversationId: conversationId ?? undefined,
          locale,
        }),
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          const id = res.headers.get('X-Conversation-Id');
          if (id) setConversationId(id);
          return res;
        },
      }),
    [conversationId, locale],
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport,
  });

  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (!stickToBottom.current || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    if (!open) {
      speech.stop();
      tts.stop();
    }
  }, [open, speech, tts]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setInput('');
      speech.stop();
      await sendMessage({ text: value });
    },
    [busy, sendMessage, speech],
  );

  const suggestions = isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <>
      <button
        type="button"
        aria-label={isAr ? 'فتح مساعد الحجز' : 'Open booking assistant'}
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 end-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg',
          'motion-safe:transition-transform motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <MessageCircle size={26} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'مساعد رحلة' : 'Rihla assistant'}
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(640px,85vh)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[400px]"
        >
          <header className="flex items-center gap-2 border-b bg-secondary/50 px-4 py-3">
            <MessageCircle size={20} className="text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">
                {isAr ? 'مساعد رحلة' : 'Rihla Assistant'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isAr ? 'ابحث عن رحلات بالعربي أو الإنجليزي' : 'Search trips in Arabic or English'}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={isAr ? 'إغلاق' : 'Close'}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </Button>
          </header>

          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.length === 0 && (
              <div className="space-y-3 text-sm">
                <p className="rounded-2xl bg-muted/60 px-3 py-2 text-muted-foreground">
                  {isAr
                    ? 'مرحباً! أقدر أساعدك تلاقي رحلات حافلات، محطات، وأسعار. مثال: عايز أروح من القاهرة لإسكندرية بكرة.'
                    : 'Hi! I can help find bus trips, stations, and prices. Try: trips from Cairo to Alexandria tomorrow.'}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
                        onClick={() => void submit(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((message) => {
              const text = messageText(message as never);
              const trips = extractTripsFromParts(
                ((message as { parts?: unknown[] }).parts ?? []) as unknown[],
              );
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col gap-2',
                    isUser ? 'items-end' : 'items-start',
                  )}
                >
                  {text ? (
                    <div
                      className={cn(
                        'max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {text}
                      {!isUser && text && tts.supported && (
                        <button
                          type="button"
                          className="ms-2 inline-flex align-middle text-muted-foreground hover:text-foreground"
                          aria-label={isAr ? 'استمع' : 'Listen'}
                          onClick={() =>
                            tts.speaking ? tts.stop() : tts.speak(text, locale)
                          }
                        >
                          {tts.speaking ? (
                            <VolumeX size={14} />
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  ) : null}
                  {trips.length > 0 && (
                    <div className="flex w-full max-w-[95%] flex-col gap-2">
                      {trips.map((trip) => (
                        <TripResultCard
                          key={trip.id}
                          trip={trip}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                {isAr ? 'جاري البحث…' : 'Searching…'}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {isAr
                  ? 'تعذر الاتصال بالمساعد. استخدم البحث العادي أو أعد المحاولة.'
                  : 'Assistant unavailable. Use normal search or retry.'}
                <button
                  type="button"
                  className="ms-2 underline"
                  onClick={() => setMessages([])}
                >
                  <RotateCcw size={12} className="inline" />{' '}
                  {isAr ? 'إعادة' : 'Reset'}
                </button>
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(input);
            }}
          >
            {speech.supported && (
              <Button
                type="button"
                size="icon"
                variant={speech.listening ? 'default' : 'outline'}
                aria-label={
                  speech.listening
                    ? isAr
                      ? 'إيقاف التسجيل'
                      : 'Stop recording'
                    : isAr
                      ? 'تسجيل صوت'
                      : 'Voice input'
                }
                onClick={() =>
                  speech.listening ? speech.stop() : speech.start()
                }
              >
                {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
            )}
            <label className="sr-only" htmlFor="rihla-assistant-input">
              {isAr ? 'رسالتك' : 'Your message'}
            </label>
            <textarea
              id="rihla-assistant-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit(input);
                }
              }}
              placeholder={
                isAr ? 'اكتب أو تحدث…' : 'Type or speak…'
              }
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              dir="auto"
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={isAr ? 'إيقاف' : 'Stop'}
                onClick={() => stop()}
              >
                <Square size={16} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label={isAr ? 'إرسال' : 'Send'}
              >
                <Send size={18} />
              </Button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
