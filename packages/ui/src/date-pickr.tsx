'use client';

import { useRef, useState, type ComponentProps } from 'react';
import { Popover } from 'radix-ui';
import { CalendarDays, ChevronDown, Clock3 } from 'lucide-react';
import {
  DayPicker,
  TZDate,
  useDayPicker,
  type MonthCaptionProps,
} from '@daypicker/react';
import { ar } from '@daypicker/react/locale/ar';
import { enGB } from '@daypicker/react/locale/en-GB';
import '@daypicker/react/style.css';
import styles from './date-pickr.module.css';

const timeZone = 'Africa/Cairo';

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
      <div className={styles.caption}>
        <div className={styles.monthSelect}>
          <select
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
          <ChevronDown size={16} aria-hidden="true" />
        </div>
        <input
          key={year}
          aria-label={labels.labelYearDropdown()}
          type="number"
          min={firstYear}
          max={lastYear}
          defaultValue={year}
          dir="ltr"
          className={styles.year}
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
    <fieldset disabled={disabled} className={styles.timeField}>
      <legend>{labels.time}</legend>
      <div className={styles.timeSegments} dir="ltr">
        <label>
          <span>{labels.hour}</span>
          <select
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
  'type' | 'value' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
  locale: string;
  labels: PickerLabels;
  min?: string;
  max?: string;
  step?: string | number;
  readOnly?: boolean;
};

function Picker({
  type = 'date',
  value,
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
  const input = useRef<HTMLInputElement>(null);
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
        onChange={(event) => onValueChange(event.currentTarget.value)}
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
            className={[styles.trigger, className].filter(Boolean).join(' ')}
          >
            <span
              className={
                (timeOnly ? time : selected) ? styles.value : styles.placeholder
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
            className={styles.popover}
          >
            {!timeOnly && (
              <DayPicker
                className={styles.calendar}
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
            <div className={styles.footer}>
              {!timeOnly && (
                <button
                  type="button"
                  className={styles.today}
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
                onClick={() => {
                  changeValue('');
                  setOpen(false);
                }}
              >
                {labels.clear}
              </button>
              <Popover.Close asChild>
                <button type="button">{labels.close}</button>
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
