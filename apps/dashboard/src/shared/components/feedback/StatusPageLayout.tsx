import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/shared/components/layout';

export function StatusPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative">
      <div className="absolute end-4 top-5 z-10">
        <LanguageSwitcher />
      </div>
      {children}
    </main>
  );
}
