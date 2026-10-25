---
version: 1
slug: 'src-app-locale-dashboard-page-tsx'
primary_target: 'src/app/[locale]/dashboard/page.tsx'
related_targets: []
---

# Dashboard overview

Mode: Operate. Scope: protected ADMIN/SUPER_ADMIN overview in separate apps/dashboard; operations
and payment outcome reports, date filtering, ar/en, existing Rihla system.
The user corrected app placement to apps/dashboard on 2026-10-25; passenger routes
remain in apps/web. The approved composition itself is unchanged.

## Direction contract

THESIS: A selected-day operational report with an unmistakable separation between
departure-day activity and recorded payment outcomes, without invented trends.

OWN-WORLD: Existing Rihla navy shell, teal selection and allocation, pale canvas,
white bordered 16px report panels, existing Arabic/English UI typography, Lucide
icons, familiar fields and buttons. Staff use this in normal desk/mobile lighting.

STORY: Identify the report day, scan trips/bookings/capacity, then inspect payment
outcomes with their distinct accounting basis. Change date or refresh explicitly.

FIRST VIEWPORT: Persistent start-side navy navigation, 82px utility header, title
and date toolbar, three operational panels in one row, full-width payment report
below. The allocation ring is a real data visualization. Mobile stacks reports
and provides accessible navigation. No new passenger hero or decorative imagery.

FORM: Grounded structure 6, work-panels; seed:975b6d34b8d298dd. Approved comp:
.impeccable/mocks/decision/work-panels.png. User selected this exact native image
on 2026-10-25. Future management pages are out of this batch. Correct factual
mock wording: Cairo is the time zone, not an origin filter; payment statuses count
settlements; example-data labeling is for synthetic previews only. Backend-only
zero-value state breakdowns remain available as report detail without obscuring
the approved hierarchy.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
