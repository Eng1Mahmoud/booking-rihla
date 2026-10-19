'use client';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import type { Seat } from '@/features/trips/types';
import type { SessionUser } from '@/stores/session-store';
type Values = { contactPhone: string; names: Record<string, string> };
export function PassengerForm({
  seats,
  user,
  onReserve,
  disabled,
}: {
  seats: Seat[];
  user: SessionUser;
  onReserve: (input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) => Promise<void>;
  disabled: boolean;
}) {
  const t = useTranslations('Seats');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>({
    defaultValues: { contactPhone: user.phone, names: {} },
    shouldUnregister: true,
  });
  return (
    <form
      className="passenger-form"
      onSubmit={handleSubmit(async (values) =>
        onReserve({
          contactPhone: values.contactPhone,
          passengers: seats.map((seat) => ({
            seatId: seat.id,
            name: values.names[seat.id]!.trim(),
          })),
        }),
      )}
    >
      <h3>{t('passengerDetails')}</h3>
      {seats.map((seat, index) => (
        <label className="field" key={seat.id}>
          <span>{t('passenger', { number: seat.number })}</span>
          <input
            autoComplete={index === 0 ? 'name' : 'off'}
            defaultValue={index === 0 ? user.name : ''}
            required
            maxLength={100}
            {...register(('names.' + seat.id) as `names.${string}`, {
              required: true,
              validate: (value) => !!value.trim(),
            })}
          />
          {errors.names?.[seat.id] && (
            <small role="alert">{t('nameRequired')}</small>
          )}
        </label>
      ))}
      <label className="field">
        <span>{t('phone')}</span>
        <input
          dir="ltr"
          type="tel"
          autoComplete="tel"
          placeholder="+201xxxxxxxxx"
          required
          pattern="\+[1-9][0-9]{7,14}"
          {...register('contactPhone')}
        />
      </label>
      <p className="muted text-xs leading-6">{t('holdNote')}</p>
      <button
        className="button-primary w-full"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? t('reserving') : t('reserve')}
      </button>
    </form>
  );
}
