import { BusFront, MapPin } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function JourneyLoading({
  title,
  description,
  variant = 'page',
}: {
  title: string;
  description: string;
  variant?: 'page' | 'inline';
}) {
  const inline = variant === 'inline';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-layout={variant}
      className={cn(
        'flex min-h-[65svh] flex-col items-center justify-center px-4 py-12 text-center [--travel-distance:clamp(4rem,25vw,6.5rem)] [--travel-start:calc(-1*var(--travel-distance))] [--travel-end:var(--travel-distance)] rtl:[--travel-start:var(--travel-distance)] rtl:[--travel-end:calc(-1*var(--travel-distance))]',
        inline &&
          'min-h-22 flex-row gap-4 p-0 text-start [--travel-distance:1.5rem]',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'relative mb-6 h-33 w-full max-w-84',
          inline && 'm-0 h-18 w-24 shrink-0',
        )}
      >
        <span className="absolute inset-x-2 bottom-5 border-t-2 border-dashed border-border" />
        <span className="absolute start-0 bottom-3.5 size-3.5 rounded-full border-2 border-primary bg-background" />
        <MapPin
          className="absolute -end-1.5 bottom-4.5 size-7 fill-background text-primary"
          strokeWidth={1.75}
        />
        <span
          data-slot="loading-vehicle"
          className={cn(
            "absolute start-[calc(50%-2rem)] bottom-8 grid size-16 place-items-center rounded-lg bg-primary text-primary-foreground after:absolute after:-bottom-3.5 after:h-[3px] after:w-9 after:rounded-full after:bg-primary after:opacity-20 after:content-[''] motion-safe:animate-[journey-travel_3.6s_cubic-bezier(0.45,0,0.55,1)_infinite]",
            inline && 'start-[calc(50%-1.25rem)] size-10 rounded-md',
          )}
        >
          <BusFront
            className={cn('size-9', inline && 'size-6')}
            strokeWidth={1.5}
          />
        </span>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-xl leading-normal font-semibold text-secondary-foreground sm:text-[28px]',
            inline && 'text-base sm:text-base',
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'mt-2 text-[15px] leading-relaxed text-muted-foreground',
            inline && 'mt-1 text-sm',
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
