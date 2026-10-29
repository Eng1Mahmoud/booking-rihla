import { queryOptions } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import { getCityOptionsAction } from '../actions/city.actions';

export function cityOptionsQuery(locale: string) {
  return queryOptions({
    queryKey: ['locations', locale, 'city-options'],
    queryFn: () => invokeAction(getCityOptionsAction),
  });
}
