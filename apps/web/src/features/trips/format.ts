import type { Trip, LocalName } from './types';
export function displayName(item: LocalName, locale: 'ar' | 'en') {
  return locale === 'ar' ? item.nameAr : item.nameEn;
}
export function formatTime(value: string, locale: 'ar' | 'en') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
export function formatDate(value: string, locale: 'ar' | 'en') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
export function formatPrice(piastres: number, locale: 'ar' | 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(piastres / 100);
}
export function routeLabel(trip: Trip, locale: 'ar' | 'en') {
  return (
    displayName(trip.route.originStation.city, locale) +
    ' — ' +
    displayName(trip.route.destinationStation.city, locale)
  );
}
