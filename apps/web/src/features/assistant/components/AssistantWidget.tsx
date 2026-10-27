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
  Sparkles,
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
      {/* Always visual right (physical right), even in RTL */}
      <button
        type="button"
        aria-label={isAr ? 'فتح مساعد الحجز' : 'Open booking assistant'}
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_rgba(0,111,123,0.55)]',
          'ring-4 ring-primary/15',
          'motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-105 motion-safe:hover:shadow-[0_14px_36px_-10px_rgba(0,111,123,0.65)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'pointer-events-none scale-90 opacity-0',
        )}
      >
        <MessageCircle size={26} strokeWidth={2.25} />
        <span className="absolute -top-0.5 -left-0.5 flex size-3.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'مساعد رحلة' : 'Rihla assistant'}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden',
            'bottom-3 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5 sm:w-[400px]',
            'max-h-[min(680px,88vh)]',
            'rounded-3xl border border-border/80 bg-background',
            'shadow-[0_24px_64px_-20px_rgba(17,47,69,0.35)]',
          )}
        >
          <header className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-primary to-[#0a5c66] px-4 py-3.5 text-primary-foreground">
            <div className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 left-8 size-24 rounded-full bg-black/10" />
            <div className="relative flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold tracking-tight">
                  {isAr ? 'مساعد رحلة' : 'Rihla Assistant'}
                </h2>
                <p className="text-[11px] text-primary-foreground/80">
                  {isAr
                    ? 'ابحث عن رحلات بالعربي أو الإنجليزي'
                    : 'Search trips in Arabic or English'}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={isAr ? 'إغلاق' : 'Close'}
                onClick={() => setOpen(false)}
                className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              >
                <X size={18} />
              </Button>
            </div>
          </header>

          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/40 via-background to-background px-3 py-3"
          >
            {messages.length === 0 && (
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-border/60 bg-card/90 px-3.5 py-3 shadow-sm">
                  <p className="leading-relaxed text-muted-foreground">
                    {isAr
                      ? 'مرحباً! أقدر أساعدك تلاقي رحلات حافلات، محطات، وأسعار. مثال: عايز أروح من القاهرة لإسكندرية بكرة.'
                      : 'Hi! I can help find bus trips, stations, and prices. Try: trips from Cairo to Alexandria tomorrow.'}
                  </p>
                </div>
                <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {isAr ? 'اقتراحات' : 'Suggestions'}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
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
                        'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm',
                        isUser
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border/60 bg-card text-foreground',
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
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin text-primary" />
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
            className="border-t border-border/70 bg-card/80 p-3 backdrop-blur-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
              {speech.supported && (
                <Button
                  type="button"
                  size="icon"
                  variant={speech.listening ? 'default' : 'ghost'}
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
                  className="shrink-0"
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
                placeholder={isAr ? 'اكتب أو تحدث…' : 'Type or speak…'}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                dir="auto"
              />
              {busy ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={isAr ? 'إيقاف' : 'Stop'}
                  onClick={() => stop()}
                  className="shrink-0"
                >
                  <Square size={16} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label={isAr ? 'إرسال' : 'Send'}
                  className="shrink-0 rounded-xl"
                >
                  <Send size={18} />
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
