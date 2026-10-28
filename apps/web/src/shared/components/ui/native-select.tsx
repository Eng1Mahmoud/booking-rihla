import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { ChevronDownIcon } from 'lucide-react';

const pickerStyles = [
  'supports-[appearance:base-select]:[&:not([multiple])]:appearance-[base-select] [&::picker(select)]:appearance-[base-select] [&::picker-icon]:hidden',
  'supports-[appearance:base-select]:[&:open:not([aria-invalid=true])]:border-primary',
  '[&::picker(select)]:my-1.5 [&::picker(select)]:max-h-[min(20rem,60dvh)] [&::picker(select)]:max-w-[calc(100vw-1rem)] [&::picker(select)]:[min-inline-size:min(anchor-size(self-inline),calc(100vw-1rem))]',
  '[&::picker(select)]:rounded-2xl [&::picker(select)]:border-2 [&::picker(select)]:border-border [&::picker(select)]:bg-card [&::picker(select)]:p-1.5 [&::picker(select)]:text-foreground [&::picker(select)]:shadow-[0_18px_40px_-10px_#112f4540]',
  '[&::picker(select)]:[font:inherit] [&::picker(select)]:[direction:inherit] [&::picker(select)]:[scrollbar-color:var(--muted)_var(--canvas)] [&::picker(select)]:[scrollbar-width:thin]',
  'supports-[appearance:base-select]:[&_option]:flex supports-[appearance:base-select]:[&_option]:min-h-11 supports-[appearance:base-select]:[&_option]:cursor-pointer supports-[appearance:base-select]:[&_option]:items-center supports-[appearance:base-select]:[&_option]:gap-3 supports-[appearance:base-select]:[&_option]:rounded-lg supports-[appearance:base-select]:[&_option]:bg-card supports-[appearance:base-select]:[&_option]:px-3 supports-[appearance:base-select]:[&_option]:py-2.5 supports-[appearance:base-select]:[&_option]:whitespace-normal supports-[appearance:base-select]:[&_option]:text-foreground supports-[appearance:base-select]:[&_option]:wrap-anywhere supports-[appearance:base-select]:[&_option]:[font:inherit]',
  'supports-[appearance:base-select]:[&_option:checked]:bg-secondary supports-[appearance:base-select]:[&_option:checked]:font-semibold supports-[appearance:base-select]:[&_option:checked]:text-primary',
  'supports-[appearance:base-select]:[&_option:enabled:is(:hover,:focus-visible)]:bg-secondary supports-[appearance:base-select]:[&_option:enabled:is(:hover,:focus-visible)]:text-foreground supports-[appearance:base-select]:[&_option:focus-visible]:outline-2 supports-[appearance:base-select]:[&_option:focus-visible]:-outline-offset-2 supports-[appearance:base-select]:[&_option:focus-visible]:outline-primary',
  'supports-[appearance:base-select]:[&_option:disabled]:cursor-not-allowed supports-[appearance:base-select]:[&_option:disabled]:text-muted-foreground [&_option::checkmark]:order-1 [&_option::checkmark]:ms-auto [&_option::checkmark]:text-primary',
  'supports-[appearance:base-select]:[&_optgroup]:font-semibold supports-[appearance:base-select]:[&_optgroup]:text-muted-foreground supports-[appearance:base-select]:[&_optgroup]:[font-family:inherit]',
].join(' ');

const controlStyles = [
  'h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-card ps-3 py-2 pe-9 text-base text-start [font-family:inherit] cursor-pointer shadow-none transition-[border-color,background-color,box-shadow] duration-150 hover:enabled:border-primary outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 md:text-sm',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
].join(' ');

const optionStyles =
  'min-h-11 cursor-pointer rounded-lg bg-card px-3 py-2.5 text-foreground transition-colors duration-150 [font:inherit] checked:bg-secondary checked:font-semibold checked:text-primary enabled:hover:bg-secondary enabled:hover:text-secondary-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted-foreground';
const optGroupStyles =
  'bg-card px-3 py-2 text-sm font-semibold text-muted-foreground [font:inherit]';

function NativeSelect({
  className,
  size = 'default',
  ...props
}: Omit<React.ComponentProps<'select'>, 'size'> & { size?: 'sm' | 'default' }) {
  return (
    <div
      className="group/native-select relative w-full min-w-0 has-[select:disabled]:opacity-50"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(pickerStyles, controlStyles, className)}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 end-3.5 size-4 -translate-y-1/2 text-primary transition-transform duration-200 ease-out select-none group-has-[select:open]/native-select:rotate-180"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>) {
  return (
    <option
      data-slot="native-select-option"
      className={cn(optionStyles, className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(optGroupStyles, className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
