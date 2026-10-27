-- Tips on finished jobs (applied 2026-10-25 as migration "add_tip"; copied here from the live project).
alter table public.bookings add column tip integer not null default 0 check (tip between 0 and 1000);
