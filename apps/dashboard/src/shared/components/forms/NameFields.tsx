'use client';
import { useTranslations } from 'next-intl';
import { FormInput } from './FormInput';

export function NameFields() {
  const t = useTranslations('Common');
  return (
    <>
      <FormInput<{ nameAr: string; nameEn: string }>
        name="nameAr"
        autoFocus
        label={t('nameAr')}
        maxLength={100}
        dir="rtl"
        lang="ar"
        autoComplete="off"
      />
      <FormInput<{ nameAr: string; nameEn: string }>
        name="nameEn"
        label={t('nameEn')}
        maxLength={100}
        dir="ltr"
        lang="en"
        autoComplete="off"
      />
    </>
  );
}
