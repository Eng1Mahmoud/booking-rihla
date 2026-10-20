'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshPage({
  label,
  autoRefresh = false,
}: {
  label: string;
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!autoRefresh) return;
    // Ticket status remains current through Server Component reads, without another API route.
    const refresh = () => {
      if (document.visibilityState === 'visible')
        startTransition(() => router.refresh());
    };
    const timer = setInterval(refresh, 30000);
    // AuthSessionSync handles focus refresh once for the whole page.
    return () => {
      clearInterval(timer);
    };
  }, [autoRefresh, router]);
  return (
    <button
      type="button"
      className="button-secondary"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </button>
  );
}
