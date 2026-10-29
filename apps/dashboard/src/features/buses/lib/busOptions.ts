import { queryOptions } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { getBusOptionsAction } from '../actions/bus.actions';
export function busOptionsQuery(locale: string) {
  return queryOptions({
    queryKey: ['fleet', locale, 'bus-options'],
    queryFn: () => invokeAction(getBusOptionsAction),
    staleTime: 30000,
  });
}
