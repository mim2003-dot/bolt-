/*
# Create ical_bookings table (single-tenant, no auth)

1. New Tables
- `ical_bookings`
  - `id` (uuid, primary key)
  - `room_id` (text, not null) — references the room ID in localStorage
  - `uid` (text, not null) — unique iCal event ID from Booking.com
  - `start_date` (date, not null) — check-in date
  - `end_date` (date, not null) — check-out date
  - `summary` (text, default 'Booking.com') — event summary / guest name
  - `created_at` (timestamptz, default now())
  - Unique constraint on (room_id, uid) to prevent duplicate syncs
2. Security
- Enable RLS on `ical_bookings`.
- Allow anon + authenticated CRUD because the app has no sign-in (single-tenant, shared data).
*/

CREATE TABLE IF NOT EXISTS ical_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  uid text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  summary text NOT NULL DEFAULT 'Booking.com',
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, uid)
);

ALTER TABLE ical_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ical_bookings" ON ical_bookings;
CREATE POLICY "anon_select_ical_bookings" ON ical_bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ical_bookings" ON ical_bookings;
CREATE POLICY "anon_insert_ical_bookings" ON ical_bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ical_bookings" ON ical_bookings;
CREATE POLICY "anon_update_ical_bookings" ON ical_bookings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ical_bookings" ON ical_bookings;
CREATE POLICY "anon_delete_ical_bookings" ON ical_bookings FOR DELETE
  TO anon, authenticated USING (true);
