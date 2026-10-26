'use client';
import { useCallback, useRef } from 'react';

export function useDialogFocus<T extends HTMLElement = HTMLButtonElement>() {
  const fallbackRef = useRef<T>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const remember = useCallback((element?: HTMLElement | null) => {
    trigger.current =
      element ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
  }, []);
  const restore = useCallback((event: Event) => {
    event.preventDefault();
    if (trigger.current?.isConnected) trigger.current.focus();
    else fallbackRef.current?.focus();
  }, []);
  return { fallbackRef, remember, restore };
}
