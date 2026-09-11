/*
# Add local details to imported Booking.com bookings

1. New columns on `ical_bookings`
- `color` (text) — locally chosen bar color, default neutral gray.
- `check_in` (text) — locally chosen check-in time, default 14:00.
- `check_out` (text) — locally chosen check-out time, default 12:00.
- `note` (text) — local note that is not sent back to Booking.com.

2. Modified table
- `ical_bookings` keeps the original iCal dates and summary from Booking.com.
- Local display details are stored separately in the new columns so syncing can refresh source data without removing personal adjustments.

3. Security
- Existing RLS remains enabled.
- Existing anon + authenticated CRUD policies remain in place because this app has no sign-in and intentionally uses one shared calendar.

4. Important notes
- Dates remain controlled by the imported iCal feed and are not editable from the local booking form.
- Existing imported bookings receive safe defaults for the new fields.
*/

ALTER TABLE ical_bookings
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#66717d',
  ADD COLUMN IF NOT EXISTS check_in text NOT NULL DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS check_out text NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
