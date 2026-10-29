'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { getBookingsAction } from '../actions/booking.actions';
import type { BookingFilters } from '../schemas/bookingSchema';
export function useBookings(tripId: string, bookingId: string) {
  const locale = useLocale();
  const list = useDataTableState<BookingFilters>({
    initialFilters: {
      reference: '',
      email: '',
      travelDate: '',
      tripId,
      userId: '',
    },
  });
  const query = useQuery({
    queryKey: ['bookings', locale, list.params],
    queryFn: () =>
      invokeAction(() =>
        getBookingsAction({
          limit: list.params.limit,
          offset: list.params.offset,
          ...list.filters,
        }),
      ),
  });
  useActionErrors(query.error, {});
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [selected, setSelected] = useState<string | null>(bookingId || null);
  const open = useCallback(
    (id: string) => {
      focus.remember();
      setSelected(id);
    },
    [focus.remember],
  );
  return {
    list,
    query,
    focus,
    selected,
    open,
    close: () => setSelected(null),
  };
}
