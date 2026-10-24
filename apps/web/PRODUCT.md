# Rihla

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Passengers planning bus journeys within Egypt, using Arabic or English on mobile
and desktop. Their job is to find a departure, choose seats, and keep track of
their booking and ticket.

## Product Purpose

Rihla is a learning and portfolio project that demonstrates a complete passenger
bus-booking experience. Success means a clear, usable journey from search to
booking and ticket, supported by simple, understandable, maintainable code.
It is not currently an operating transport business.

## Operating Context

Passengers search by departure and arrival city or station and travel date,
review departures, select available seats, enter passenger information, and
follow booking, payment, and ticket status. Account pages retain booking and
payment history; station information and FAQs support planning.

Current development is local and proceeds in small reviewable steps. The user
owns Git commits and pushes. Launch preparation, final policies, integration
testing for launch, and an administration dashboard are outside the current
design scope.

## Capabilities and Constraints

- Preserve all existing passenger features, routes, actions, and states.
- Preserve Arabic/English localization, RTL/LTR, locale-safe links, and keyboard
  access. Full-width mobile controls must remain usable with long station names.
- Preserve authentication, authorization, user-owned data, passenger draft
  retention, seat-conflict recovery, payment ordering/idempotency, and verified
  ticket access. A visual refinement does not change API contracts.
- Keep existing architecture, components, and utilities. Avoid speculative
  abstractions, unrelated refactors, and unnecessary dependencies.
- Use isolated previews and synthetic data for design verification. Do not read
  real environment files or use real database, mail, or payment services.
- Existing terms and privacy pages are drafts. Do not invent operational,
  compliance, customer, pricing, or service-quality claims.

## Brand Commitments

Keep the Rihla / رحلة name, existing identity and imagery, factual bilingual
copy, and passenger-focused language. Current work refines the existing
interface rather than replacing its visual direction.

## Evidence on Hand

- Implemented passenger workflows under src/features and src/app/[locale].
- Existing Arabic and English product copy in src/messages/ar.json and en.json.
- Existing journey photograph at public/images/rihla-coastal-journey.webp.
- Synthetic preview data and screenshots are demonstrations, not evidence of
  real customers, real reservations, or an operating service.

## Product Principles

1. Make the passenger's next action clear and practical at narrow mobile widths.
2. Preserve product behavior and recovery paths while improving presentation.
3. Give Arabic and English equal care, including layout direction and content.
4. Keep implementation readable enough to learn from and maintain.
5. Demonstrate only capabilities and facts supported by the project.

## Open Decisions

Launch timing, final policy and business details, and future administration
scope remain deferred. No distinctive commercial positioning or additional
product-specific accessibility certification has been established.
