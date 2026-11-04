/*
# Create bookings table for manual booking sync across devices

## Purpose
Manually created bookings are currently stored only in localStorage on each device, so they don't sync between a user's PC and phone. This migration creates a `bookings` table in the database so manual bookings sync the same way iCal bookings and rooms already do.

## New Tables
- `bookings`
  - `id` (text, primary key) — client-generated booking ID (e.g. "booking-1698..."), matches existing app logic
  - `room_id` (text, not null) — references rooms.id, cascade delete so removing a room cleans up its bookings
  - `guest` (text, not null default '') — guest name
  - `start` (date, not null) — check-in date
  - "end" (date, not null) — check-out date (quoted because "end" is a reserved keyword in Postgres)
  - `check_in` (text, not null default '') — check-in time as string (e.g. "14:00")
  - `check_out` (text, not null default '') — check-out time as string
  - `color` (text, not null default '#1b86b5') — booking bar color
  - `note` (text, not null default '') — free-text note
  - `created_at` (timestamptz, default now())

## Security
- Enable RLS on `bookings`.
- Grant SELECT, INSERT, UPDATE, DELETE to `anon` + `authenticated` (single-tenant app, no sign-in — matches existing ical_bookings and rooms policies).
- Four per-verb policies, all `USING (true)` / `WITH CHECK (true)` — data is intentionally shared across the user's own devices, same pattern as ical_bookings and rooms.
*/

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest text NOT NULL DEFAULT '',
  start date NOT NULL,
  "end" date NOT NULL,
  check_in text NOT NULL DEFAULT '',
  check_out text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#1b86b5',
  note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE
  TO anon, authenticated USING (true);
