'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui';
export function RefreshPage({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="min-h-11"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  );
}
