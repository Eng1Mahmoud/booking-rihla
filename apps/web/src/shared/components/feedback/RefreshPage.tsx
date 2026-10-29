'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';

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
    // Interactive feature data uses TanStack focus refresh.
    return () => {
      clearInterval(timer);
    };
  }, [autoRefresh, router]);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 bg-card"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  );
}
