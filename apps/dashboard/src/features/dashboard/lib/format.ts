export function cairoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function formatReportTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
// BigInt preserves exact backend money strings beyond Number's safe range.
export function formatGrossPaid(piastres: string, locale: string) {
  const value = BigInt(piastres);
  const fraction = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(Number(value % BigInt(100)));
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  })
    .formatToParts(value / BigInt(100))
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}
