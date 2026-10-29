'use client';
import { useTranslations } from 'next-intl';
import { Check, Mail, ShieldCheck } from 'lucide-react';
import { Form, FormInput, SubmitButton } from '@/shared/components/forms';
import { UserAvatar } from './UserAvatar';
import { useProfile } from '../hooks/useProfile';
import { profileSchema, type ProfileInput } from '../schemas/profileSchema';

export function AccountProfile() {
  const t = useTranslations('Account');
  const { user, update } = useProfile();
  if (!user) return null;

  async function save(values: ProfileInput) {
    await update.mutateAsync(values);
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-labelledby="profile-title"
    >
      <div className="flex items-center gap-4 border-b bg-secondary/30 px-5 py-6 sm:px-8">
        <UserAvatar className="size-16 ring-4 ring-card" />
        <div className="min-w-0">
          <h2 id="profile-title" className="text-xl font-semibold">
            {t('profile')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('profileHint')}
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-8">
        <div className="mb-7 flex items-start gap-3 border-b pb-6">
          <Mail
            size={19}
            aria-hidden="true"
            className="mt-1 shrink-0 text-primary"
          />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t('email')}</p>
            <p className="mt-1 wrap-anywhere font-medium">
              <bdi>{user.email}</bdi>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('emailReadOnly')}
            </p>
          </div>
        </div>
        <Form
          key={user.id}
          schema={profileSchema}
          defaultValues={{ name: user.name, phone: user.phone }}
          onSubmit={save}
        >
          <FormInput<ProfileInput>
            name="name"
            label={t('name')}
            autoComplete="name"
            maxLength={100}
          />
          <FormInput<ProfileInput>
            name="phone"
            label={t('phone')}
            type="tel"
            autoComplete="tel"
            maxLength={16}
            description={t('phoneHint')}
          />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <SubmitButton pendingText={t('saving')}>{t('save')}</SubmitButton>
            {update.isSuccess && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-emerald-700"
              >
                <Check size={17} aria-hidden="true" />
                {t('saved')}
              </p>
            )}
          </div>
        </Form>
        <p className="mt-7 flex items-start gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {t('bookingUnchanged')}
        </p>
      </div>
    </section>
  );
}
