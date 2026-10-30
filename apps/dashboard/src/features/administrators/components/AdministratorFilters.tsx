'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useSearchParams } from 'next/navigation';

export function AdministratorFilters() {
  const urlParams = useSearchParams();
  const activeFilters = {
    email: urlParams.get('filter.email') ?? '',
    role: urlParams.get('filter.role') ?? '',
    isActive: urlParams.get('filter.isActive') ?? '',
  };
  const t = useTranslations('Users');
  const states = useTranslations('States');
  return (
    <form
      key={JSON.stringify(activeFilters)}
      className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const url = new URL(window.location.href);
        for (const name of Object.keys(activeFilters)) {
          const value = String(data.get(name) ?? '').trim();
          if (value) url.searchParams.set('filter.' + name, value);
          else url.searchParams.delete('filter.' + name);
        }
        url.searchParams.delete('filter.search');
        url.searchParams.delete('offset');
        if (url.href !== window.location.href)
          window.history.pushState(
            null,
            '',
            url.pathname + url.search + url.hash,
          );
      }}
    >
      <label className="grid min-w-0 flex-1 basis-56 gap-2 text-sm">
        <span>{t('email')}</span>
        <Input
          name="email"
          type="email"
          dir="ltr"
          defaultValue={activeFilters.email}
          className="min-h-11 bg-card"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span>{t('role')}</span>
        <NativeSelect
          name="role"
          defaultValue={activeFilters.role}
          className="min-h-11"
        >
          <NativeSelectOption value="">{t('all')}</NativeSelectOption>
          <NativeSelectOption value="STAFF">
            {states('STAFF')}
          </NativeSelectOption>
          <NativeSelectOption value="ADMIN">
            {states('ADMIN')}
          </NativeSelectOption>
          <NativeSelectOption value="SUPER_ADMIN">
            {states('SUPER_ADMIN')}
          </NativeSelectOption>
        </NativeSelect>
      </label>
      <label className="grid gap-2 text-sm">
        <span>{t('status')}</span>
        <NativeSelect
          name="isActive"
          defaultValue={activeFilters.isActive}
          className="min-h-11"
        >
          <NativeSelectOption value="">{t('all')}</NativeSelectOption>
          <NativeSelectOption value="true">{t('active')}</NativeSelectOption>
          <NativeSelectOption value="false">
            {t('suspended')}
          </NativeSelectOption>
        </NativeSelect>
      </label>
      <Button type="submit" className="min-h-11">
        {t('apply')}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={(event) => {
          event.currentTarget.form?.reset();
          const url = new URL(window.location.href);
          for (const name of Array.from(url.searchParams.keys())) {
            if (name.startsWith('filter.')) url.searchParams.delete(name);
          }
          url.searchParams.delete('offset');
          if (url.href !== window.location.href)
            window.history.pushState(
              null,
              '',
              url.pathname + url.search + url.hash,
            );
        }}
      >
        {t('clear')}
      </Button>
    </form>
  );
}
