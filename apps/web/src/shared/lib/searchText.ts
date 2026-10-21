export function searchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}
