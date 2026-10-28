export function getSessionRetryPath(value: unknown, locale: string) {
  const fallback = '/' + locale;
  if (
    typeof value !== 'string' ||
    !value.startsWith('/' + locale + '/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value)
  )
    return fallback;
  return value;
}
