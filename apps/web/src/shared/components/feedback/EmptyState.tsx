import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  children,
  heading: Heading = 'h2',
  role,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  heading?: 'h1' | 'h2';
  role?: 'alert';
}) {
  return (
    <section
      className="rounded-xl border bg-card px-5 py-10 text-center md:px-8 md:py-14"
      role={role}
    >
      <Heading className="text-xl font-semibold md:text-2xl">{title}</Heading>
      {description && (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      )}
    </section>
  );
}
