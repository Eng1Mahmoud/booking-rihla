'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { boundedHistory } from '../lib/messages';
import { useSpeechToText } from './useSpeech';

export function useAssistantChat(locale: 'ar' | 'en') {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const conversationId = useRef<string | null>(null);
  const lastSelectedTripId = useRef<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const speech = useSpeechToText(locale);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant/chat',
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, messages: boundedHistory(messages) },
        }),
        body: () => ({
          conversationId: conversationId.current ?? undefined,
        }),
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          const id = res.headers.get('X-Conversation-Id');
          if (id) conversationId.current = id;
          return res;
        },
      }),
    [],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    setMessages,
    clearError,
    regenerate,
  } = useChat({
    transport,
  });

  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (!stickToBottom.current || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript.slice(0, 4000));
  }, [speech.transcript]);

  useEffect(() => {
    if (!open) speech.stop();
  }, [open, speech.stop]);

  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );

  const reset = async () => {
    await stop();
    speech.cancel();
    conversationId.current = null;
    lastSelectedTripId.current = undefined;
    setMessages([]);
    clearError();
    setInput('');
    stickToBottom.current = true;
    inputRef.current?.focus();
  };

  const retry = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await regenerate({
        body: { locale, selectedTripId: lastSelectedTripId.current },
      });
    } finally {
      submitting.current = false;
    }
  };

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = useCallback(
    async (text: string, selectedTripId?: string) => {
      const value = text.trim();
      if (!value || busy || submitting.current || value.length > 4000) return;
      submitting.current = true;
      lastSelectedTripId.current = selectedTripId;
      setInput('');
      speech.cancel();
      try {
        await sendMessage(
          { text: value },
          { body: { locale, selectedTripId } },
        );
      } finally {
        submitting.current = false;
      }
    },
    [busy, sendMessage, speech, locale],
  );
  return {
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
  };
}
