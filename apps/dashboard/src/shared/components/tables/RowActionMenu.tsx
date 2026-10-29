'use client';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui';

export type RowAction = {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function RowActionMenu({
  name,
  actions,
}: {
  name: string;
  actions: RowAction[];
}) {
  const t = useTranslations('Common');
  const locale = useLocale();
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedAction = useRef<(() => void) | null>(null);
  if (!actions.length) return null;
  const label = t('actionsNamed', { name });
  return (
    <div className="flex justify-center">
      <DropdownMenu dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
            aria-label={label}
            title={label}
            disabled={actions.every((action) => action.disabled)}
          >
            <EllipsisVertical className="size-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          aria-label={label}
          className="w-56 max-w-[calc(100vw-2rem)]"
          onCloseAutoFocus={(event) => {
            const action = selectedAction.current;
            selectedAction.current = null;
            if (!action) return;
            // Close the menu first so existing dialogs remember the persistent dots button.
            event.preventDefault();
            trigger.current?.focus();
            action();
          }}
        >
          {actions.map(
            ({ label, icon: Icon, onSelect, disabled, destructive }) => (
              <DropdownMenuItem
                key={label}
                disabled={disabled}
                className={
                  destructive
                    ? 'text-destructive focus:bg-destructive/5 focus:text-destructive'
                    : undefined
                }
                onSelect={() => {
                  selectedAction.current = onSelect;
                }}
              >
                {Icon && <Icon aria-hidden="true" />}
                <span className="min-w-0 whitespace-normal wrap-anywhere">
                  {label}
                </span>
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
