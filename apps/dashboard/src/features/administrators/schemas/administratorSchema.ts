import { z } from 'zod';
import type { useTranslations } from 'next-intl';
export function createAdministratorRoleFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      role: z.enum(['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'], {
        error: t('selection'),
      }),
    },
    { error: t?.('invalid') },
  );
}
export type AdministratorFilters = {
  email: string;
  role: '' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: '' | 'true' | 'false';
};
