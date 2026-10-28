'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Popover } from 'radix-ui';
import { CalendarDays, ChevronDown, Clock3 } from 'lucide-react';
import {
  DayPicker,
  TZDate,
  useDayPicker,
  type MonthCaptionProps,
  type ClassNames,
} from '@daypicker/react';
import { ar } from '@daypicker/react/locale/ar';
import { enGB } from '@daypicker/react/locale/en-GB';

const timeZone = 'Africa/Cairo';

const calendarClasses: Partial<ClassNames> = {
  root: 'relative w-full',
  months: 'relative block max-w-none',
  month: 'relative',
  month_caption:
    'relative mx-10 flex h-12 items-center justify-center text-sm font-bold',
  month_grid: 'mt-3 w-full table-fixed border-collapse',
  weekday: 'py-2 text-center text-xs font-medium text-muted-foreground',
  day: 'group/day h-11 w-[calc(100%/7)] p-px text-center text-sm tabular-nums',
  day_button:
    'm-0 flex h-10.5 w-full cursor-pointer items-center justify-center rounded-[0.625rem] border-2 border-transparent bg-transparent p-0 text-inherit [font:inherit] hover:bg-secondary disabled:cursor-default group-data-[selected]/day:border-primary group-data-[selected]/day:bg-primary group-data-[selected]/day:font-bold group-data-[selected]/day:text-primary-foreground',
  button_previous:
    'absolute start-0 top-0 inline-flex h-12 w-10 cursor-pointer appearance-none items-center justify-center rounded-[0.625rem] border-0 bg-transparent p-0 hover:bg-secondary disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50',
  button_next:
    'absolute end-0 top-0 inline-flex h-12 w-10 cursor-pointer appearance-none items-center justify-center rounded-[0.625rem] border-0 bg-transparent p-0 hover:bg-secondary disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50',
  chevron: 'inline-block fill-primary',
  outside: 'text-muted-foreground',
  today:
    '[&:not([data-selected])>button]:border-primary [&:not([data-selected])>button]:font-bold [&:not([data-selected])>button]:text-primary',
  disabled: 'not-data-[selected]:opacity-50',
  hidden: 'invisible',
};

const pickerSelectClassName =
  'supports-[appearance:base-select]:[&:not([multiple])]:appearance-[base-select] [&::picker(select)]:appearance-[base-select] [&::picker-icon]:hidden supports-[appearance:base-select]:[&:open:not([aria-invalid=true])]:border-primary [&::picker(select)]:my-1.5 [&::picker(select)]:max-h-[min(20rem,60dvh)] [&::picker(select)]:max-w-[calc(100vw-1rem)] [&::picker(select)]:[min-inline-size:min(anchor-size(self-inline),calc(100vw-1rem))] [&::picker(select)]:rounded-md [&::picker(select)]:border-0 [&::picker(select)]:bg-card [&::picker(select)]:p-1.5 [&::picker(select)]:text-foreground [&::picker(select)]:shadow-[0_12px_36px_-8px_#112f4533] [&::picker(select)]:[font:inherit] [&::picker(select)]:[direction:inherit] [&::picker(select)]:[scrollbar-color:var(--muted)_var(--canvas)] [&::picker(select)]:[scrollbar-width:thin] supports-[appearance:base-select]:[&_option]:flex supports-[appearance:base-select]:[&_option]:min-h-11 supports-[appearance:base-select]:[&_option]:cursor-pointer supports-[appearance:base-select]:[&_option]:items-center supports-[appearance:base-select]:[&_option]:gap-3 supports-[appearance:base-select]:[&_option]:rounded-sm supports-[appearance:base-select]:[&_option]:bg-card supports-[appearance:base-select]:[&_option]:px-3 supports-[appearance:base-select]:[&_option]:py-2.5 supports-[appearance:base-select]:[&_option]:whitespace-normal supports-[appearance:base-select]:[&_option]:text-foreground supports-[appearance:base-select]:[&_option]:wrap-anywhere supports-[appearance:base-select]:[&_option]:[font:inherit] supports-[appearance:base-select]:[&_option:checked]:bg-accent supports-[appearance:base-select]:[&_option:checked]:font-semibold supports-[appearance:base-select]:[&_option:checked]:text-primary supports-[appearance:base-select]:[&_option:enabled:is(:hover,:focus-visible)]:bg-accent supports-[appearance:base-select]:[&_option:enabled:is(:hover,:focus-visible)]:text-accent-foreground supports-[appearance:base-select]:[&_option:focus-visible]:outline-2 supports-[appearance:base-select]:[&_option:focus-visible]:-outline-offset-2 supports-[appearance:base-select]:[&_option:focus-visible]:outline-primary supports-[appearance:base-select]:[&_option:disabled]:cursor-not-allowed supports-[appearance:base-select]:[&_option:disabled]:text-muted-foreground [&_option::checkmark]:order-1 [&_option::checkmark]:ms-auto [&_option::checkmark]:text-primary supports-[appearance:base-select]:[&_optgroup]:font-semibold supports-[appearance:base-select]:[&_optgroup]:text-muted-foreground supports-[appearance:base-select]:[&_optgroup]:[font-family:inherit]';

const timeSelectClassName = `${pickerSelectClassName} h-13 w-full min-w-0 cursor-pointer appearance-auto rounded-[0.5rem] border border-transparent bg-secondary px-1.5 text-center text-base font-semibold tabular-nums [font-family:inherit]`;

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  // Construct from 2000 so JavaScript does not interpret years 1–99 as 1901–1999.
  const date = new TZDate(2000, month - 1, day, 12, timeZone);
  date.setFullYear(year);
  return year >= 1 &&
    year <= 9999 &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

function cairoToday() {
  const value = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return calendarDate(value)!;
}
function formatClock(value: string, labels: PickerLabels) {
  if (!value) return labels.chooseTime;
  const [hours, ...rest] = value.split(':');
  const hour = Number(hours);
  return (
    String(hour % 12 || 12).padStart(2, '0') +
    ':' +
    rest.join(':') +
    ' ' +
    (hour >= 12 ? labels.pm : labels.am)
  );
}
function dateValue(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function CalendarCaption({ calendarMonth, className }: MonthCaptionProps) {
  const { goToMonth, labels, dayPickerProps } = useDayPicker();
  const year = calendarMonth.date.getFullYear();
  const month = calendarMonth.date.getMonth();
  const firstYear = dayPickerProps.startMonth!.getFullYear();
  const lastYear = dayPickerProps.endMonth!.getFullYear();
  const monthFormat = new Intl.DateTimeFormat(dayPickerProps.lang, {
    month: 'long',
    timeZone,
  });
  function goTo(year: number, month: number) {
    goToMonth(
      calendarDate(
        String(year).padStart(4, '0') +
          '-' +
          String(month + 1).padStart(2, '0') +
          '-01',
      )!,
    );
  }
  return (
    <div className={className}>
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <select
            className={`${pickerSelectClassName} h-11 w-full min-w-0 appearance-none rounded-[0.5rem] border border-transparent bg-secondary ps-2 pe-7 text-start text-sm font-semibold [font-family:inherit]`}
            aria-label={labels.labelMonthDropdown()}
            value={month}
            onChange={(event) => goTo(year, Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index}>
                {monthFormat.format(
                  calendarDate(
                    '2000-' + String(index + 1).padStart(2, '0') + '-01',
                  )!,
                )}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute end-2 top-3.5 text-primary"
          />
        </div>
        <input
          key={year}
          aria-label={labels.labelYearDropdown()}
          type="number"
          min={firstYear}
          max={lastYear}
          defaultValue={year}
          dir="ltr"
          className="h-11 w-18 min-w-0 shrink-0 rounded-[0.5rem] border border-transparent bg-secondary px-1 text-center text-sm font-semibold tabular-nums [font-family:inherit]"
          onBlur={(event) => {
            const value = Number(event.currentTarget.value);
            if (
              Number.isInteger(value) &&
              value >= firstYear &&
              value <= lastYear
            )
              goTo(value, month);
            else event.currentTarget.value = String(year);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  );
}

function TimeFields({
  value,
  onChange,
  labels,
  step,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  labels: PickerLabels;
  step?: string | number;
  disabled?: boolean;
}) {
  const parts = value.split(':');
  const hour = Number(parts[0] || 0);
  const minute = parts[1] || '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const seconds =
    parts.length > 2 ||
    step === 'any' ||
    (step !== undefined && Number(step) < 60);
  const second = parts[2]?.split('.')[0] || '00';
  function change(
    nextHour = displayHour,
    nextMinute = minute,
    nextPeriod = period,
    nextSecond = parts[2] || '00',
  ) {
    const hour24 = (nextHour % 12) + (nextPeriod === 'PM' ? 12 : 0);
    onChange(
      String(hour24).padStart(2, '0') +
        ':' +
        nextMinute +
        (seconds ? ':' + nextSecond : ''),
    );
  }
  const number = new Intl.NumberFormat('en', { minimumIntegerDigits: 2 });
  return (
    <fieldset
      disabled={disabled}
      className="mt-3 border-0 border-t border-border pt-3 text-sm"
    >
      <legend className="pb-2 text-[13px] text-muted-foreground">
        {labels.time}
      </legend>
      <div
        className="flex flex-wrap gap-2 [&>label]:min-w-0 [&>label]:flex-[1_1_64px] [&>label>span]:mb-1.5 [&>label>span]:block [&>label>span]:text-center [&>label>span]:text-xs [&>label>span]:text-muted-foreground rtl:[&>label:last-child]:basis-full"
        dir="ltr"
      >
        <label>
          <span>{labels.hour}</span>
          <select
            className={timeSelectClassName}
            value={displayHour}
            onChange={(event) => change(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {number.format(i + 1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.minute}</span>
          <select
            className={timeSelectClassName}
            value={minute}
            onChange={(event) => change(displayHour, event.target.value)}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={number.format(i)}>
                {number.format(i)}
              </option>
            ))}
          </select>
        </label>
        {seconds && (
          <label>
            <span>{labels.second}</span>
            <select
              className={timeSelectClassName}
              value={second}
              onChange={(event) =>
                change(
                  displayHour,
                  minute,
                  period,
                  event.target.value +
                    (parts[2]?.includes('.')
                      ? '.' + parts[2].split('.')[1]
                      : ''),
                )
              }
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={number.format(i)}>
                  {number.format(i)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>{labels.period}</span>
          <select
            className={timeSelectClassName}
            value={period}
            onChange={(event) =>
              change(displayHour, minute, event.target.value)
            }
          >
            <option value="AM">{labels.am}</option>
            <option value="PM">{labels.pm}</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export type PickerLabels = {
  chooseDate: string;
  chooseTime: string;
  period: string;
  am: string;
  pm: string;
  hour: string;
  minute: string;
  second: string;
  today: string;
  clear: string;
  close: string;
  time: string;
};

export type PickerProps = Omit<
  ComponentProps<'button'>,
  'type' | 'value' | 'onChange' | 'defaultValue'
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  locale: string;
  labels: PickerLabels;
  min?: string;
  max?: string;
  step?: string | number;
  readOnly?: boolean;
};

function Picker({
  type = 'date',
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  locale,
  labels,
  min,
  max,
  step,
  readOnly,
  disabled,
  name,
  className,
  onBlur,
  ...props
}: PickerProps & { type: 'date' | 'time' }) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(defaultValue);
  const value = controlledValue ?? localValue;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = input.current?.form;
    function reset() {
      if (controlledValue === undefined) setLocalValue(defaultValue);
      setOpen(false);
    }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [controlledValue, defaultValue]);
  const selected = calendarDate(value.slice(0, 10));
  const firstDate = calendarDate(min?.slice(0, 10) ?? '0001-01-01')!;
  const lastDate = calendarDate(max?.slice(0, 10) ?? '9999-12-31')!;
  const timeOnly = type === 'time';

  const time = value;
  const today = cairoToday();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const unavailable = disabled || readOnly;
  const format = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
  const placeholder = timeOnly ? labels.chooseTime : labels.chooseDate;
  const Icon = timeOnly ? Clock3 : CalendarDays;

  function changeValue(next: string) {
    if (unavailable || !input.current) return;
    // A real input event also reaches form-level change handlers (e.g. batch-preview invalidation).
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input.current, next);
    input.current.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function selectDate(date: Date) {
    changeValue(dateValue(date));
    setOpen(false);
  }
  return (
    <>
      <input
        ref={input}
        type="text"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (controlledValue === undefined) setLocalValue(next);
          onValueChange?.(next);
        }}
      />
      <Popover.Root open={open && !unavailable} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            {...props}
            data-slot={timeOnly ? 'time-picker' : 'date-pickr'}
            type="button"
            disabled={disabled}
            aria-readonly={readOnly || undefined}
            onBlur={onBlur}
            className={[
              'flex min-h-12 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-2 text-start text-foreground [font:inherit] motion-safe:transition-[border-color,background-color] motion-safe:duration-150 hover:border-primary hover:bg-secondary/50 data-[state=open]:border-primary data-[state=open]:outline-2 data-[state=open]:outline-primary/15 focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-[#4eacd8] disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive [&>svg]:shrink-0 [&>svg]:text-primary',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={
                (timeOnly ? time : selected)
                  ? 'min-w-0 tabular-nums'
                  : 'text-muted-foreground'
              }
            >
              {timeOnly
                ? formatClock(time, labels)
                : selected
                  ? format.format(selected)
                  : placeholder}
            </span>
            <Icon size={20} aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            collisionPadding={8}
            dir={direction}
            aria-label={placeholder}
            className="z-100 max-h-(--radix-popover-content-available-height) w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-card p-3 text-foreground shadow-[0_12px_36px_-8px_#112f4533] outline-none [scrollbar-color:var(--muted)_var(--canvas)] [&_button:focus-visible]:outline-[3px] [&_button:focus-visible]:outline-offset-0 [&_button:focus-visible]:outline-[#4eacd8] [&_input:focus-visible]:outline-[3px] [&_input:focus-visible]:outline-offset-0 [&_input:focus-visible]:outline-[#4eacd8] [&_select:focus-visible]:outline-[3px] [&_select:focus-visible]:outline-offset-0 [&_select:focus-visible]:outline-[#4eacd8]"
          >
            {!timeOnly && (
              <DayPicker
                classNames={calendarClasses}
                mode="single"
                required
                autoFocus
                timeZone={timeZone}
                lang={locale}
                locale={locale === 'ar' ? ar : enGB}
                numerals={locale === 'ar' ? 'arab' : 'latn'}
                dir={direction}
                weekStartsOn={locale === 'ar' ? 6 : 1}
                navLayout="around"
                selected={selected}
                today={today}
                defaultMonth={selected ?? today}
                startMonth={firstDate}
                endMonth={lastDate}
                disabled={{ before: firstDate, after: lastDate }}
                showOutsideDays
                components={{ MonthCaption: CalendarCaption }}
                onSelect={selectDate}
              />
            )}
            {timeOnly && (
              <TimeFields
                value={time}
                labels={labels}
                step={step}
                disabled={disabled}
                onChange={(next) => changeValue(next)}
              />
            )}
            <div className="sticky -bottom-3 mt-3 flex items-center justify-between gap-1 border-t border-border bg-card pt-3 [&>button]:min-h-11 [&>button]:cursor-pointer [&>button]:rounded-[0.5rem] [&>button]:border-0 [&>button]:px-3.5 [&>button]:py-2 [&>button]:text-sm [&>button]:[font-family:inherit] [&>button:hover]:bg-secondary [&>button:hover]:text-secondary-foreground [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-50">
              {!timeOnly && (
                <button
                  type="button"
                  className="bg-secondary font-semibold text-primary"
                  disabled={
                    dateValue(today) < dateValue(firstDate) ||
                    dateValue(today) > dateValue(lastDate)
                  }
                  onClick={() => selectDate(cairoToday())}
                >
                  {labels.today}
                </button>
              )}
              <button
                type="button"
                className="bg-transparent text-muted-foreground"
                onClick={() => {
                  changeValue('');
                  setOpen(false);
                }}
              >
                {labels.clear}
              </button>
              <Popover.Close asChild>
                <button
                  type="button"
                  className="bg-transparent text-muted-foreground"
                >
                  {labels.close}
                </button>
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

export function DatePickr(props: PickerProps) {
  return <Picker {...props} type="date" />;
}
export function TimePicker(props: PickerProps) {
  return <Picker {...props} type="time" />;
}
