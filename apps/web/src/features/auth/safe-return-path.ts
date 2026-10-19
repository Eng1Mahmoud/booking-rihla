export function safeReturnPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  try {
    const url = new URL(value, 'https://rihla.invalid');
    return url.origin === 'https://rihla.invalid'
      ? url.pathname + url.search + url.hash
      : '/';
  } catch {
    return '/';
  }
}
