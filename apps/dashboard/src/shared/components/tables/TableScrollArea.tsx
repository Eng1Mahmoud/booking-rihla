'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function TableScrollArea({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const t = useTranslations('DataTable');
  const id = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = React.useState({
    overflow: false,
    left: false,
    right: false,
  });
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function update() {
      if (!container) return;
      const maximum = container.scrollWidth - container.clientWidth;
      const position =
        getComputedStyle(container).direction === 'rtl'
          ? maximum + container.scrollLeft
          : container.scrollLeft;
      const next = {
        overflow: maximum > 1,
        left: position > 1,
        right: position < maximum - 1,
      };
      setScroll((current) =>
        current.overflow === next.overflow &&
        current.left === next.left &&
        current.right === next.right
          ? current
          : next,
      );
    }
    const observer = new ResizeObserver(update);
    observer.observe(container);
    if (container.firstElementChild)
      observer.observe(container.firstElementChild);
    container.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', update);
    };
  }, []);
  function move(direction: -1 | 1) {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(180, container.clientWidth * 0.7),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }
  return (
    <div className="min-w-0">
      {scroll.overflow && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
            {t('scrollHint')}
          </p>
          <div className="flex gap-1" dir="ltr">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={t('scrollLeft')}
              aria-controls={id}
              disabled={!scroll.left}
              onClick={() => move(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={t('scrollRight')}
              aria-controls={id}
              disabled={!scroll.right}
              onClick={() => move(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id={id}
        data-slot="table-container"
        role="region"
        aria-label={label}
        tabIndex={scroll.overflow ? 0 : undefined}
        className="relative w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        {children}
      </div>
    </div>
  );
}
