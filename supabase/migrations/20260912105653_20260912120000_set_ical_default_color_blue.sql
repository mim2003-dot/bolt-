ALTER TABLE ical_bookings ALTER COLUMN color SET DEFAULT '#1b86b5';
ALTER TABLE ical_bookings ALTER COLUMN check_in SET DEFAULT '';
ALTER TABLE ical_bookings ALTER COLUMN check_out SET DEFAULT '';
UPDATE ical_bookings SET color = '#1b86b5' WHERE color IS NULL OR color = '';
