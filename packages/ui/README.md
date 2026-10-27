# Shared date and time controls

Import controlled `DatePickr` and `TimePicker` from `@booking-bus/ui/date-pickr`.
Both apps expose form adapters with the same names from `@/shared/components/forms/DatePickr`.
Date and time fields are explicit components, separate from normal `FormInput`.

`DatePickr` accepts `YYYY-MM-DD`, localized labels, `min`, `max`, disabled/read-only state and a focus ref.
`TimePicker` presents styled hour/minute and AM/PM selects while retaining `HH:mm` internally. Existing seconds and milliseconds are preserved; a seconds select appears when needed.
Both controls emit normal bubbling input events, preserving batch-preview invalidation and other form change handling.

The single-trip editor takes departure date, departure time and elapsed journey duration. Its schema calculates the original API fields `departureAt` and `arrivalAt` in Cairo time. Arrival is displayed automatically, including its date when a journey crosses midnight. Ambiguous or nonexistent Cairo departure times are rejected.

Both apps transpile this source workspace. CSS modules use their existing shared color tokens.
