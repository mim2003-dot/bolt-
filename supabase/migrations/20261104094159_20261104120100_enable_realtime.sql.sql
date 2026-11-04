/*
# Enable realtime for bookings, rooms, and ical_bookings

## Purpose
The app subscribes to Supabase Realtime to get live updates when bookings, rooms, or ical_bookings change from another device. This migration adds all three tables to the `supabase_realtime` publication so change events are broadcast.

## Changes
- Add `rooms`, `ical_bookings`, and `bookings` to the `supabase_realtime` publication.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE ical_bookings;
