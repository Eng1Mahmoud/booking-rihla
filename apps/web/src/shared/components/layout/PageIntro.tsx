import type { ReactNode } from 'react';
import { BusFront, MapPin, Ticket } from 'lucide-react';

export function PageIntro({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-secondary/60">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] gap-8 py-10 md:py-16 lg:grid-cols-[1fr_280px] lg:items-center lg:gap-16">
        <div className="relative z-10">
          <p className="mb-4 text-sm font-medium text-primary">{eyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.5] tracking-tight md:text-[48px] md:leading-[1.35]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-8 text-muted-foreground md:text-base">
            {description}
          </p>
          {children}
        </div>
        <div
          className="relative hidden h-48 items-center justify-center lg:flex"
          aria-hidden="true"
        >
          <div className="absolute size-48 rounded-full border border-primary/15" />
          <div className="absolute h-28 w-64 -rotate-12 rounded-full border border-dashed border-primary/20" />
          <div className="relative flex size-24 items-center justify-center rounded-[1.75rem] border border-white bg-white text-primary shadow-[0_16px_40px_-16px_#112f4530]">
            <BusFront size={42} strokeWidth={1.4} />
          </div>
          <span className="absolute start-3 top-4 flex size-12 items-center justify-center rounded-2xl border border-white bg-card text-primary shadow-sm">
            <MapPin size={22} />
          </span>
          <span className="absolute end-1 bottom-4 flex size-12 rotate-12 items-center justify-center rounded-2xl border border-white bg-[#f3dfb7] text-secondary-foreground shadow-sm">
            <Ticket size={22} />
          </span>
        </div>
      </div>
    </section>
  );
}
