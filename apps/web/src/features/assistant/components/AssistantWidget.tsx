'use client';
import { Dialog } from 'radix-ui';
import { Link } from '@/i18n/navigation';
import {
  ArrowUp,
  MessageCircle,
  X,
  Send,
  Square,
  Mic,
  MicOff,
  RotateCcw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { AssistantResults } from './AssistantResults';
import { useAssistantChat } from '../hooks/useAssistantChat';
import { messageText } from '../lib/messages';

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

function errorLabel(error: Error, isAr: boolean) {
  if (error.message.includes('AI_RATE_LIMIT'))
    return isAr
      ? 'وصل المساعد لحد الطلبات. انتظر قليلًا أو استخدم البحث العادي.'
      : 'Assistant request limit reached. Wait a little or use normal search.';
  if (error.message.includes('ASSISTANT_TIMEOUT'))
    return isAr
      ? 'استغرق الرد وقتًا أطول من المتوقع. أعد المحاولة أو استخدم البحث العادي.'
      : 'The assistant took too long. Retry or use normal search.';
  if (error.message.includes('VALIDATION_ERROR'))
    return isAr
      ? 'تعذر إرسال الرسالة. استخدم رسالة أقصر من ٤٠٠٠ حرف.'
      : 'Message could not be sent. Keep it under 4,000 characters.';
  return isAr
    ? 'تعذر الاتصال بالمساعد. أعد المحاولة أو استخدم البحث العادي.'
    : 'Assistant unavailable. Retry or use normal search.';
}

function assistantDisplayText(text: string) {
  return text.replaceAll('\\*', '*').replaceAll('**', '');
}

export function AssistantWidget() {
  const locale = useLocale() as 'ar' | 'en';
  const isAr = locale === 'ar';
  const footer = useTranslations('Footer');
  const {
    open,
    setOpen,
    input,
    setInput,
    listRef,
    inputRef,
    launcherRef,
    speech,
    messages,
    busy,
    stop,
    error,
    reset,
    retry,
    onScroll,
    submit,
  } = useAssistantChat(locale);
  const suggestions = isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <div className="print:hidden fixed bottom-5 right-5 z-40 flex flex-col items-center gap-3">
        {!open && (
          <a
            href="#top"
            aria-label={footer('backToTop')}
            title={footer('backToTop')}
            className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm motion-safe:transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <ArrowUp size={22} aria-hidden="true" />
          </a>
        )}
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label={isAr ? 'فتح مساعد الحجز' : 'Open booking assistant'}
            ref={launcherRef}
            tabIndex={open ? -1 : 0}
            aria-hidden={open}
            className={cn(
              'relative flex size-14 items-center justify-center rounded-full',
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
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          dir={isAr ? 'rtl' : 'ltr'}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            launcherRef.current?.focus();
          }}
          className={cn(
            'print:hidden fixed z-50 flex flex-col overflow-hidden',
            'bottom-3 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5 sm:w-[400px]',
            'max-h-[min(680px,88vh)]',
            'rounded-3xl border border-border/80 bg-background',
            'shadow-[0_24px_64px_-20px_rgba(17,47,69,0.35)]',
          )}
        >
          <header className="relative shrink-0 overflow-hidden border-b border-primary/10 bg-gradient-to-br from-primary to-[#0a5c66] px-4 py-3.5 text-primary-foreground">
            <div className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 left-8 size-24 rounded-full bg-black/10" />
            <div className="relative flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <Dialog.Title asChild>
                  <h2 className="text-sm font-semibold tracking-tight text-primary-foreground">
                    {isAr ? 'مساعد رحلة' : 'Rihla Assistant'}
                  </h2>
                </Dialog.Title>
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
                aria-label={isAr ? 'محادثة جديدة' : 'New chat'}
                onClick={() => void reset()}
                className="size-11 shrink-0 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              >
                <RotateCcw size={18} />
              </Button>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                  className="size-11 shrink-0 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                >
                  <X size={18} />
                </Button>
              </Dialog.Close>
            </div>
          </header>

          <div
            ref={listRef}
            onScroll={onScroll}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/40 via-background to-background px-3 py-3"
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

            <div
              role="log"
              aria-label={isAr ? 'رسائل المحادثة' : 'Chat messages'}
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={busy}
              className="space-y-3"
            >
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const rawText = messageText(message);
                const text = isUser ? rawText : assistantDisplayText(rawText);
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
                          'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] shadow-sm',
                          isUser
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md border border-border/60 bg-card text-foreground',
                        )}
                      >
                        {text}
                      </div>
                    ) : null}
                    {!isUser && (
                      <AssistantResults
                        parts={message.parts}
                        locale={locale}
                        pending={busy}
                        showSuggestions={index === messages.length - 1 && !busy}
                        onSend={submit}
                        onDetails={(tripId) =>
                          void submit(
                            isAr
                              ? 'اعرض تفاصيل هذه الرحلة.'
                              : 'Show details for this trip.',
                            tripId,
                          )
                        }
                        onNavigate={() => setOpen(false)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {busy && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
              >
                <Loader2 size={14} className="animate-spin text-primary" />
                {isAr ? 'جاري البحث…' : 'Searching…'}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {errorLabel(error, isAr)}
                <button
                  type="button"
                  className="ms-2 underline"
                  disabled={busy}
                  onClick={() => void retry()}
                >
                  <RotateCcw size={12} className="inline" />{' '}
                  {isAr ? 'إعادة المحاولة' : 'Retry'}
                </button>
                <Link
                  href="/"
                  className="ms-2 underline"
                  onClick={() => setOpen(false)}
                >
                  {isAr ? 'البحث العادي' : 'Normal search'}
                </Link>
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-border/70 bg-card/80 p-3 backdrop-blur-sm"
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
                ref={inputRef}
                maxLength={4000}
                id="rihla-assistant-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void submit(input);
                  }
                }}
                placeholder={
                  speech.supported
                    ? isAr
                      ? 'اكتب أو تحدث…'
                      : 'Type or speak…'
                    : isAr
                      ? 'اكتب رسالتك…'
                      : 'Type your message…'
                }
                className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base sm:text-sm outline-none"
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
            {speech.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {speech.error === 'not-allowed' ||
                speech.error === 'service-not-allowed'
                  ? isAr
                    ? 'اسمح باستخدام الميكروفون من إعدادات المتصفح أو اكتب رسالتك.'
                    : 'Allow microphone access in browser settings, or type your message.'
                  : isAr
                    ? 'تعذر التقاط الصوت. حاول مجددًا أو اكتب رسالتك.'
                    : 'Voice input failed. Try again or type your message.'}
              </p>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
