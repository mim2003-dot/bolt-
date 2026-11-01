/*
# Create rooms table (single-tenant, no auth)

1. New Tables
- `rooms`
  - `id` (text, primary key) - room identifier used by bookings and iCal imports
  - `name` (text, not null) - room name shown in the timeline
  - `color` (text, nullable) - background color of the room cell
  - `ical_url` (text, nullable) - Booking.com iCal export link for the room
  - `created_at` (timestamptz, default clock_timestamp()) - keeps rooms in creation order

2. Security
- Enable RLS on `rooms`.
- Grant CRUD to `anon` and `authenticated` because the app has no sign-in and rooms are shared.
- Policies allow anon + authenticated to select, insert, update and delete rows.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text,
  ical_url text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE
  TO anon, authenticated USING (true);
