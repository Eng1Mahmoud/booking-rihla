import { z } from 'zod';
export const paymobCheckoutUrlSchema = z
  .string()
  .max(8192)
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      url.origin === 'https://accept.paymob.com' &&
      url.pathname === '/unifiedcheckout/' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      /^(?:egy_)?pk_?test_[A-Za-z0-9_-]+$/.test(
        url.searchParams.get('publicKey') ?? '',
      ) &&
      /^(?:egy_)?csk_test_[A-Za-z0-9_-]+$/.test(
        url.searchParams.get('clientSecret') ?? '',
      ) &&
      [...url.searchParams.keys()].length === 2
    );
  });
