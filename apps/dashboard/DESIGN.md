---
name: 'Rihla Dashboard'
description: 'Bilingual staff reports in the existing Rihla navy and teal identity.'
colors:
  ocean: '#006f7b'
  navy: '#112f45'
  ink: '#183648'
  canvas: '#f5f8f8'
  paper: '#ffffff'
  muted: '#566b77'
  border: '#dce6e8'
  secondary: '#eaf3f2'
  icon-wash: '#edf8f8'
  note-wash: '#eef7fb'
  note-icon: '#157ba9'
  focus: '#4eacd8'
  nav-current: '#0b6372'
  nav-hover: '#24485a'
  info: '#4593d7'
  success: '#12a96a'
  warning: '#e9a02c'
  danger: '#df5366'
  quiet-status: '#94a3b3'
  destructive: '#b42318'
typography:
  display:
    fontFamily: 'Wix Madefor Display, Segoe UI, Arial, sans-serif'
    fontSize: 'clamp(30px, 3vw, 47px)'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  headline:
    fontSize: 'clamp(21px, 1.7vw, 27px)'
    fontWeight: 700
    lineHeight: 1.3
  metric:
    fontSize: '28px'
    fontWeight: 700
  payment:
    fontSize: 'clamp(27px, 2.65vw, 42px)'
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
  body-en:
    fontFamily: 'Segoe UI, Arial, sans-serif'
  body-ar:
    fontFamily: 'IBM Plex Sans Arabic, Arial, sans-serif'
  label:
    fontSize: '14px'
    fontWeight: 500
  note:
    fontSize: '14px'
    lineHeight: 1.7
  metadata:
    fontSize: '13px'
    lineHeight: 1.5
rounded:
  md: '0.75rem'
  control: '10px'
  panel: '16px'
  circle: '50%'
spacing:
  compact: '8px'
  control: '12px'
  base: '16px'
  inset: '20px'
  section: '24px'
components:
  button-primary:
    backgroundColor: '{colors.ocean}'
    textColor: '{colors.paper}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
    height: '40px'
  button-outline:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
    height: '44px'
  button-ghost:
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    size: '44px'
  button-ghost-hover:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.navy}'
  field:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '4px 12px'
    height: '48px'
  report-panel:
    backgroundColor: '{colors.paper}'
    rounded: '{rounded.panel}'
    padding: '24px'
  navigation-current:
    backgroundColor: '{colors.nav-current}'
    textColor: '{colors.paper}'
    rounded: '{rounded.control}'
    padding: '14px 18px'
  payment-note:
    backgroundColor: '{colors.note-wash}'
    textColor: '{colors.navy}'
    rounded: '{rounded.md}'
    padding: '16px 20px'
    typography: '{typography.note}'
---

# Design System: Rihla Dashboard

## Overview

**Creative North Star: "Rihla work panels"**

The staff application inherits Rihla's navy shell, teal actions, pale canvas and bilingual UI language. Clear white panels and restrained color separate report groups while keeping dense numeric content easy to scan.

This record describes the shipped dashboard and login sources, especially src/app/globals.css, the dashboard feature components and shared controls. The approved work-panels direction supplies the name; implemented source supplies the rules. Future management screens have not been implemented or documented here.

**Key Characteristics:**

- Navy structure, teal action and allocation, white bordered report surfaces.
- Locale-aware Arabic and English typography with mirrored start-side navigation.
- Large tabular metrics, labeled status colors and explicit data provenance.
- Flat report surfaces with subtle control feedback.

## Colors

Deep maritime structure and cool paper surfaces preserve the incumbent Rihla identity.

### Primary

- **Ocean:** primary actions, selection, allocation arc and primary status markers.
- **Navy:** navigation shell, headings and emphasized numbers.

### Secondary

- **Secondary wash:** ghost hover and skeleton surfaces.
- **Icon wash:** circular report icon backgrounds.
- **Note wash / note icon:** payment-basis annotation and information icon.
- **Status colors:** info, success, warning, danger and quiet-status distinguish labeled rows. Destructive belongs to invalid fields and error feedback.
- **Navigation current / hover:** distinct active and hover fills within the navy shell.
- **Focus:** global keyboard outline for links and buttons; fields and buttons also use the ocean ring treatment.

### Neutral

- **Canvas / paper:** application background and panel/header surfaces.
- **Ink / muted:** normal text and secondary explanations, labels and timestamps.
- **Border:** panel outlines, row dividers and allocation track.

**The Labeled Status Rule.** Pair every colored status dot with a visible localized label; the allocation chart also exposes its percentage as text and an accessible name.

## Typography

**Display Font:** self-hosted Wix Madefor Display (700), with Segoe UI, Arial and sans-serif fallbacks; only the English overview title uses it. Its font and license ship in public/fonts.
**Body Font:** Segoe UI, Arial, sans-serif for English; IBM Plex Sans Arabic, Arial, sans-serif for Arabic. Arabic headings inherit the Arabic family. The locale layout loads IBM Plex weights 400, 500, 600 and 700.

The English overview title has a compact display voice; report content and Arabic retain the existing UI typography. Text follows locale direction; the wordmark and credential inputs explicitly retain LTR direction.

### Hierarchy

- **Display:** the frontmatter display ramp belongs to the overview title, with balanced wrapping. Arabic uses the same sizing and weight with its Arabic family.
- **Headline:** report titles use headline. Login uses a UI heading (24px, 600); error headings use 20px or 24px, 600 according to context.
- **Metrics:** operational and capacity values use metric and tabular numerals. Compact payment counts use 20px, 700. Ring text scales from 24px to 34px.
- **Payment:** gross paid uses payment and can wrap anywhere for large amounts; its label is 18px. Locale-formatted currency is isolated with bdi.
- **Body:** toolbar explanation follows body and stops at 65ch. Report row labels inherit body sizing.
- **Label / note / metadata:** fields use label; payment notes use note; update timestamps use metadata. Capacity and allocation notes are 14px. Navigation labels are 15px. The language link uses 12px below 768px and 14px above it.

**The Exact Amount Rule.** Preserve localized gross-paid currency, both fractional digits and bidi isolation; its visual prominence must not turn gross paid into a claim of net revenue or payouts.

## Layout

The shell starts in one column. Below 1024px the header exposes a menu button; from 1024px a sticky start-side navy rail fills the viewport height with width clamp(200px, 14.25vw, 240px). The header is at least 82px tall. Main padding is 28px 16px, increasing at 768px to 30px 34px.

Reports stack below 768px, use two columns at 768px, and three at 1280px. Between 768px and 1279px the capacity panel deliberately spans the full row, with title/note in one half and allocation in the other. Report gaps are 14px; payments sit 16px below operations. Panel insets are 24px, 20px below 640px, and 24px 27px from 1280px. Desktop operational panels have a minimum height of 374px.

The toolbar stacks with 24px gaps until 1024px, then forms a row at least 128px tall. Its desktop date block is 40% wide with a 330px minimum. Date and action share a row until below 640px, where both occupy full width. Desktop date controls are 50px high. Payments use two equal columns at 768px, with a logical start divider and 48px inset. Below 640px gross-paid text loses its icon indent and the payment note wraps its timestamp onto a separate row.

Use logical inline spacing and start borders to mirror RTL. The mobile drawer is min(22rem, calc(100vw - 2rem)) wide and scrolls independently. Header identity is simplified below 640px. Login centers a maximum 28rem-wide column with 1rem viewport margins.

## Elevation & Depth

Report panels and fields are flat, separated by thin borders and tonal surfaces. Primary and outline buttons retain subtle ambient shadows. Focus outlines and rings communicate keyboard state. The mobile overlay stacks at 50, drawer at 60 and skip link at 100; these are interaction layers rather than raised report cards.

### Shadow Vocabulary

- **Primary action:** 0 4px 12px -6px #006f7b70.
- **Outline action:** Tailwind shadow-xs, equivalent to 0 1px 2px 0 rgb(0 0 0 / 0.05).

**The Flat Reports Rule.** Use border and surface tone to separate reports; keep button shadows scoped to their existing control variants.

## Shapes

Panels use panel radius; shared controls use md; the date action and navigation links use control. Report icon circles are 72px with 30px SVGs, reducing to 56px circles below 640px. Status dots are 13px circles. The allocation ring is an SVG data display with an 11-unit stroke in a 120-unit viewBox, border track and ocean arc. Its box is 160px, reducing to 150px on small screens, capped at 53% of its row.

## Components

### Buttons

Familiar controls use 14px medium text, 200ms feedback and a 1px active translation. Primary is ocean/paper, outline is canvas with a border, and ghost gains the secondary wash on hover. Default height is 40px; submit buttons are full-width 48px; desktop date controls are 50px; header icon targets are 44px. Pending controls disable and expose busy state; disabled opacity is 50%. Focus uses an ocean border and 3px half-opacity ring plus the global visible outline. Reduced-motion preference removes animation and transitions.

### Cards / Containers

White bordered panels use the panel shape and responsive insets above. Heading rows combine a circular Lucide SVG icon with a localized title. Operational rows use 48px minimum height and bottom dividers except the last row; payment rows use 36px. Values align opposite labels. No chips or interactive management cards ship in this batch.

### Inputs / Fields

Actual form fields override the low-level input's tinted background with white and use a 48px height, 12px horizontal inset, associated labels, hints and errors. The date field is native and uses md radius. Ocean focus rings and destructive invalid borders/rings accompany textual errors linked through aria-describedby. Login fields keep LTR direction in both locales; pending submission replaces button text and disables it.

### Navigation

The navy rail contains three in-page report links and the passenger-site link. Overview carries current-page state; section links do not dynamically change it. White labels and Lucide icons sit in rounded, 56px-minimum rows. Mobile uses Radix Dialog with a dimmed navy overlay, accessible title, close action and start-side drawer. Link activation and crossing to desktop close the drawer. Preserve keyboard focus behavior and skip-to-main.

### Allocation and payment provenance

The ring represents reported allocation including valid holds; zero allocation uses a butt arc cap. Occupied and available counts remain visible beside it. The payment panel pairs exact gross paid with settlement counts and its readable basis note. Production includes the payment report timestamp; synthetic previews show an example-data label instead. The operational timestamp stays in the date block, separate from payment provenance.

### Loading, empty and error states

Loading keeps the report grid with an accessible busy status, pulsing pale placeholders and rounded panel silhouettes. Reduced motion disables pulse. Empty results retain zero-valued reports with status text. Operational and payment failures render independently with panel alerts and outline refresh controls; available report content remains visible. Route failures offer retry; invalid dates offer a localized return-to-today link.

## Do's and Don'ts

### Do:

- Do preserve the existing Rihla identity, localized labels and logical RTL spacing.
- Do pair status color with text and preserve the allocation chart's visible percentage.
- Do retain payment basis, separate update timestamps and exact localized currency presentation.
- Do keep capacity full-width at tablet sizes and retain readable mobile control targets.

### Don't:

- Don't convert flat report panels into elevated decorative cards.
- Don't use English display typography for Arabic content or general body text.
- Don't remove loading, zero-data or partial-failure feedback when extending the report UI.
- Don't treat preview data or the approved composition image as operational evidence.

Not canonized or repaired: no additional visual defects were promoted into this system. No raster plates ship. Automated Impeccable phase transitions remain pending as disclosed in .impeccable/review/workflow-status.md; this documentation does not assert native gate completion.
