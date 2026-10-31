'use client';
import type { ComponentProps } from 'react';
import { DropdownMenu as DropdownPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';

/** Non-modal by default so opening menus does not lock body scroll / shift layout. */
export function DropdownMenu({
  modal = false,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Root>) {
  return <DropdownPrimitive.Root modal={modal} {...props} />;
}
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({
  className,
  sideOffset = 10,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-40 overflow-y-auto rounded-md bg-card p-1.5 text-card-foreground shadow-lg outline-none',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={cn('my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}
const itemStyles =
  'relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';
export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(itemStyles, className)}
      {...props}
    />
  );
}
export function DropdownMenuSub(
  props: ComponentProps<typeof DropdownPrimitive.Sub>,
) {
  return <DropdownPrimitive.Sub {...props} />;
}
export function DropdownMenuSubTrigger({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.SubTrigger>) {
  return (
    <DropdownPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        itemStyles,
        'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSubContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownPrimitive.SubContent>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-40 overflow-y-auto rounded-md bg-card p-1.5 text-card-foreground shadow-lg outline-none',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}
