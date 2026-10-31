'use client';
import { useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/components/ui/dropdown-menu';

export type RowMenuItem = {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
};

export type RowAction = {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  // When set, renders a submenu of these items instead of a direct action.
  items?: RowMenuItem[];
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
          {actions.map((action) => {
            const { label: text, icon: Icon, destructive, disabled } = action;
            const className = destructive
              ? 'text-destructive focus:bg-destructive/5 focus:text-destructive'
              : undefined;
            const content = (
              <>
                {Icon && <Icon aria-hidden="true" />}
                <span className="min-w-0 whitespace-normal wrap-anywhere">
                  {text}
                </span>
              </>
            );
            if (action.items)
              return (
                <DropdownMenuSub key={text}>
                  <DropdownMenuSubTrigger
                    disabled={disabled}
                    className={className}
                  >
                    {content}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    aria-label={text}
                    className="w-56 max-w-[calc(100vw-2rem)]"
                  >
                    {action.items.map(
                      ({
                        label: itemText,
                        onSelect,
                        disabled: itemDisabled,
                      }) => (
                        <DropdownMenuItem
                          key={itemText}
                          disabled={itemDisabled}
                          onSelect={() => {
                            selectedAction.current = onSelect ?? null;
                          }}
                        >
                          {itemText}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            if (action.href && !disabled)
              return (
                <DropdownMenuItem key={text} className={className} asChild>
                  <Link href={action.href} prefetch={false}>
                    {content}
                  </Link>
                </DropdownMenuItem>
              );
            return (
              <DropdownMenuItem
                key={text}
                disabled={disabled}
                className={className}
                onSelect={() => {
                  selectedAction.current = action.onSelect ?? null;
                }}
              >
                {content}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
