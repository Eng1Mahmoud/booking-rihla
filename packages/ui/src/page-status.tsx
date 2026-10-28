import type { ReactNode } from 'react';
import {
  BusFront,
  FileQuestion,
  ShieldX,
  TriangleAlert,
  WifiOff,
} from 'lucide-react';

const icons = {
  403: ShieldX,
  404: FileQuestion,
  500: TriangleAlert,
  503: WifiOff,
};

export function PageStatus({
  status,
  title,
  description,
  codeLabel,
  children,
}: {
  status: keyof typeof icons;
  title: string;
  description: string;
  codeLabel: string;
  children: ReactNode;
}) {
  const Icon = icons[status];
  return (
    <section
      aria-labelledby="page-status-title"
      className="mx-auto flex min-h-[62svh] w-[calc(100%-2rem)] max-w-xl flex-col items-center justify-center py-12 text-center sm:py-16"
    >
      <div
        aria-hidden="true"
        className="relative mb-8 flex h-24 w-56 items-center justify-center"
      >
        <span className="absolute inset-x-0 bottom-3 border-t border-dashed" />
        <span className="absolute start-0 bottom-2 size-2 rounded-full bg-border" />
        <span className="absolute end-0 bottom-2 size-2 rounded-full bg-border" />
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-secondary text-primary [--status-arrival-offset:-2rem] motion-safe:animate-[status-arrival_900ms_cubic-bezier(0.16,1,0.3,1)_both] rtl:[--status-arrival-offset:2rem]">
          <BusFront className="size-10" strokeWidth={1.5} />
          <span className="absolute -end-2 -top-2 flex size-8 items-center justify-center rounded-full border bg-card">
            <Icon className="size-4" />
          </span>
        </div>
      </div>
      <h1
        id="page-status-title"
        className="text-3xl leading-snug font-semibold text-balance sm:text-4xl"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-8 text-muted-foreground">
        {description}
      </p>
      <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
        {children}
      </div>
      <p className="mt-7 text-sm text-muted-foreground">
        {codeLabel} <bdi className="font-medium tabular-nums">{status}</bdi>
      </p>
    </section>
  );
}
