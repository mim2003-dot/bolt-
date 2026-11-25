# Project memory

## Product intent & audience

- Booking/calendar management app with a tabular calendar grid and an analytics/reporting view.
- Users can create bookings manually; bookings are visualized as colored diamonds in the calendar grid.
- UI language is Russian.

## Brand personality & voice

- Direct, technical, fix-oriented communication in Russian.

## Visual design & UX direction

- Calendar grid uses diamond-shaped markers (“ромбы”) to represent bookings; new manually-added bookings are green.
- Report view is a modal/window containing charts, tables, and filters; it must be fully isolated from the calendar layer.
- Layering rule: report modal z-index is always above the calendar; calendar diamonds are constrained to the calendar grid only and must never overflow into other views/modals.
- Prefer explicit stacking-context isolation (containment/z-index) for calendar vs. report layers.

## Decisions, constraints & rationale

- Manual bookings produced diamonds that overflowed/covered the whole table and even appeared over the Report modal; root cause was missing layer isolation.
- Fix applied: diamonds isolated within calendar grid; report modal raised above calendar so bookings cannot render over report analytics.
- Build verified successful after the fix.

## Open questions & assumptions

- Assumption: diamond overflow was a CSS stacking/overflow issue rather than a data/rendering bug; confirm no recurrence when bookings span many days.
- Open: whether manually-entered bookings should be visually distinct (green) only briefly or permanently.