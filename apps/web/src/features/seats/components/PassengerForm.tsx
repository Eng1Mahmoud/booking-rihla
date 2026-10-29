'use client';
import { useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import type { Seat } from '@/features/trips/types/trip';
import type { AuthUser } from '@/features/auth/types/auth';
import {
  createPassengerFormSchema,
  type PassengerValues,
} from '../schemas/passengerSchema';
import type { FieldPath } from 'react-hook-form';

export function PassengerForm({
  seats,
  user,
  onReserve,
  disabled,
}: {
  seats: Seat[];
  user: AuthUser;
  onReserve: (input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) => Promise<void>;
  disabled: boolean;
}) {
  const t = useTranslations('Seats');
  const formMessages = useTranslations('Forms');
  return (
    <Form
      schema={createPassengerFormSchema(formMessages)}
      defaultValues={{ contactPhone: user.phone, names: {} }}
      shouldUnregister
      onSubmit={(values) =>
        onReserve({
          contactPhone: values.contactPhone,
          passengers: seats.map((seat) => ({
            seatId: seat.id,
            name: values.names[seat.id]!,
          })),
        })
      }
    >
      <h3 id="passenger-details-heading" className="font-semibold">
        {t('passengerDetails')}
      </h3>
      {seats.map((seat, index) => (
        <FormInput<PassengerValues>
          key={seat.id}
          name={('names.' + seat.id) as FieldPath<PassengerValues>}
          label={t('passenger', { number: seat.number })}
          autoComplete={index === 0 ? 'name' : 'off'}
          maxLength={100}
          defaultValue={index === 0 ? user.name : ''}
          autoFocus={index === 0}
        />
      ))}
      <FormInput<PassengerValues>
        name="contactPhone"
        label={t('phone')}
        type="tel"
        autoComplete="tel"
        placeholder="+201xxxxxxxxx"
      />
      <p className="text-xs leading-6 text-muted-foreground">{t('holdNote')}</p>
      <SubmitButton disabled={disabled} pendingText={t('reserving')}>
        {t('reserve')}
      </SubmitButton>
    </Form>
  );
}
