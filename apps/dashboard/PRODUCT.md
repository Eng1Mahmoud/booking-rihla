# Rihla Dashboard

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Verified, active staff with ADMIN or SUPER_ADMIN access operate the bus-booking
platform. Passenger-facing booking remains in the separate apps/web application.

## Product Purpose

This is the administration application of the existing Rihla learning/portfolio
project, separate from the passenger app. It mirrors apps/web's feature-based
organization and bilingual conventions while serving staff operations.

## Operating Context

The confirmed first batch is a protected shell and read-only daily overview of
operations and payment outcomes, connected to the existing API. The user approved
the work-panels design with a side navigation rail, three operational reports,
and a separate payment report. The next approved batch adds city/station lists, bilingual name search, city
filtering, pagination, create/edit forms and confirmed deletes with existing
relationship safeguards. Trip, booking, fleet, user and refund-management
screens follow in separately reviewed batches.

## Capabilities and Constraints

- Build in apps/dashboard with its own development command and sign-in/session.
  Session cookies must be named independently from the passenger app, including
  local development where ports do not isolate browser cookies.
- Preserve the existing API, permissions, backend authorization, payment safety,
  and passenger app behavior. Do not relocate passenger routes to build the admin.
- Use the current API transport/auth conventions and server-side role checks.
- Operational reports use the selected departure day in Africa/Cairo; seat
  allocation includes valid temporary holds. Available capacity need not be
  bookable capacity.
- Payment reports use last recorded settlement update, not departure date.
  Verified gross paid is not net revenue or bank payouts. Preserve exact amounts.
- Support Arabic/English, RTL/LTR, keyboard access and mobile layouts.
- Prefer simple readable code, existing libraries and narrowly scoped changes.
- Use isolated synthetic verification, without real environment files, database,
  mail, or payment services. Launch and comprehensive integration tests remain
  deferred. The user owns commits and pushes.

## Brand Commitments

Keep the Rihla / رحلة identity and existing UI language. The approved dashboard
image is the composition reference. Do not introduce a replacement visual world.

## Evidence on Hand

The existing passenger implementation and bilingual copy establish the incumbent
identity. The administration API implements the report capabilities. Development
comps and synthetic data illustrate layout; they are not operational evidence.

## Product Principles

1. Make the operator's selected report day, data scope and next action clear.
2. Keep staff and passenger interfaces and sessions independent.
3. Preserve exact financial meaning and safe permission boundaries.
4. Give Arabic, English and narrow-screen use equal care.
5. Keep the implementation easy to learn from and maintain.
