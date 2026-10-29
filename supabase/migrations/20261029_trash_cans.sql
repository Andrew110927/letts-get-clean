-- Trash can cleaning, priced per can (site_settings.trash.price, $15 to start).
-- A trash booking stores how many cans in size ("3 cans"), the way a bike booking stores the bike type,
-- and takes a normal time slot at the customer's house. Only the list of allowed services changes.
alter table public.bookings drop constraint bookings_service_check;
alter table public.bookings add constraint bookings_service_check check (service in ('car', 'bike', 'house', 'trash'));
