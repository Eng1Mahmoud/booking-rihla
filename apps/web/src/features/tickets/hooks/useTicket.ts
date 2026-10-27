'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ticketKeys } from './queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { invokeAction } from '@/shared/lib/apiResult';
import { getTicketAction } from '../actions/tickets.actions';
import type { TicketViewData } from '../types/ticket';

export function useTicket(
  initial: TicketViewData,
  userId: string,
  readAt: number,
) {
  const locale = useLocale();
  const { user } = useAuth();
  const ticketRef = useRef<HTMLElement>(null);
  const [printStatus, setPrintStatus] = useState<
    'idle' | 'checking' | 'ready' | 'error'
  >('idle');
  const [printData, setPrintData] = useState<TicketViewData | null>(null);
  const busy = printStatus === 'checking' || printStatus === 'ready';
  const query = useQuery({
    queryKey: ticketKeys.detail(userId, locale, initial.bookingId),
    queryFn: () => invokeAction(() => getTicketAction(initial.bookingId)),
    initialData: initial,
    initialDataUpdatedAt: readAt,
    enabled: user?.id === userId,
    staleTime: 0,
    refetchOnWindowFocus: !busy,
    refetchOnReconnect: !busy,
  });

  useEffect(() => {
    function finishPrinting() {
      setPrintStatus('idle');
      setPrintData(null);
    }
    window.addEventListener('afterprint', finishPrinting);
    return () => window.removeEventListener('afterprint', finishPrinting);
  }, []);

  async function printTicket() {
    if (busy || query.isFetching || user?.id !== userId) return;
    setPrintStatus('checking');
    setPrintData(null);
    try {
      // Every print starts with a live read; cached tickets cannot authorize printing.
      const result = await query.refetch();
      if (!result.isSuccess || !ticketRef.current) {
        setPrintStatus('idle');
        return;
      }
      // Render this exact verified snapshot before waiting for its QR image.
      flushSync(() => setPrintData(result.data));
      await document.fonts.ready;
      const images = Array.from(
        ticketRef.current?.querySelectorAll<HTMLImageElement>(
          'img[data-passenger-qr]',
        ) ?? [],
      );
      if (images.length !== result.data.passengers.length || !images.length)
        throw new Error('Missing passenger QR');
      await Promise.all(images.map((image) => image.decode()));
      if (!ticketRef.current) return;
      flushSync(() => setPrintStatus('ready'));
      window.print();
      // afterprint resets the snapshot when the dialog closes, including on cancel.
    } catch {
      setPrintData(null);
      setPrintStatus('error');
    }
  }

  return {
    ...query,
    user,
    data: printData ?? (query.dataUpdatedAt < readAt ? initial : query.data),
    isError: query.isError && query.errorUpdatedAt >= readAt,
    ticketRef,
    printTicket,
    printStatus,
    printReady: printStatus === 'ready' && !query.isError && !query.isFetching,
    busy,
  };
}
