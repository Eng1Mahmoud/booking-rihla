import { getTranslations } from 'next-intl/server';
import { KeyRound } from 'lucide-react';
import { PasswordRecoveryFlow } from './PasswordRecoveryFlow';

export async function PasswordRecovery({
  initialStep,
  returnTo,
}: {
  initialStep: 'request' | 'reset';
  returnTo: string;
}) {
  const t = await getTranslations('Recovery');
  return (
    <section className="mx-auto grid w-[calc(100%_-_2rem)] max-w-[980px] gap-8 py-10 md:grid-cols-2 md:items-center md:gap-14 md:py-16">
      <div className="space-y-4">
        <KeyRound size={30} aria-hidden="true" />
        <h1 className="text-3xl font-semibold leading-relaxed md:text-4xl">
          {t('introTitle')}
        </h1>
        <p className="text-muted-foreground">{t('introText')}</p>
      </div>
      <div className="rounded-[1.75rem] border border-white bg-card p-6 shadow-[0_20px_70px_-45px_#112f4550] sm:p-9">
        <PasswordRecoveryFlow initialStep={initialStep} returnTo={returnTo} />
      </div>
    </section>
  );
}
