import type { ReactNode } from 'react';
export function RecordDetails({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid min-w-0 gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="grid min-w-0 gap-1 border-b pb-3 last:border-0"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 font-medium wrap-anywhere">
            {item.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
