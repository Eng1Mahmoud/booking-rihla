'use client';
import { useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { ApiError, isUncertainRequestError } from '@/shared/lib/apiResult';
import { useResetPassword } from '../../hooks/useAuth';
import {
  createRecoveryResetSchema,
  type RecoveryValues,
} from '../../schemas/recoverySchema';
import { ResetPasswordActions } from './ResetPasswordActions';

export function ResetPasswordForm({
  initialEmail,
  codeSent,
  onReset,
}: {
  initialEmail: string;
  codeSent: boolean;
  onReset: () => void;
}) {
  const t = useTranslations('Recovery');
  const resetPassword = useResetPassword();
  const schema = createRecoveryResetSchema(t('mismatch'));

  return (
    <Form
      schema={schema}
      defaultValues={{
        email: initialEmail,
        code: '',
        newPassword: '',
        confirmPassword: '',
      }}
      onSubmit={async (values) => {
        try {
          await resetPassword.mutateAsync(values);
          onReset();
        } catch (error) {
          // A lost response may mean the password changed; do not submit again automatically.
          if (isUncertainRequestError(error))
            throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', t('uncertain'));
          throw error;
        }
      }}
    >
      <FormInput<RecoveryValues>
        name="email"
        label={t('email')}
        type="email"
        dir="ltr"
        autoComplete="email"
        maxLength={254}
      />
      <FormInput<RecoveryValues>
        name="code"
        label={t('code')}
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
      />
      <FormInput<RecoveryValues>
        name="newPassword"
        label={t('newPassword')}
        type="password"
        autoComplete="new-password"
        maxLength={128}
        description={t('passwordHint')}
      />
      <FormInput<RecoveryValues>
        name="confirmPassword"
        label={t('confirmPassword')}
        type="password"
        autoComplete="new-password"
        maxLength={128}
      />
      <ResetPasswordActions codeSent={codeSent} />
    </Form>
  );
}
