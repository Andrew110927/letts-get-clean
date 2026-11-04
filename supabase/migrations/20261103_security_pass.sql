-- Security pass (2026-11-03): website visitors can only fill in the booking fields the form really has, and a
-- flood of bookings from bots stops at the database instead of filling Andrew's calendar.
--
-- Already in place before this file (checked 2026-11-03, kept as is): RLS on every table, owner-only policies via
-- is_owner(), anon can only INSERT bookings and SELECT site settings, card/Stripe fields cleared for visitors,
-- customer links set by the database, terms time stamped by the database, length/format checks on every field,
-- and 4 website bookings per phone per day.

-- 1. Field lock. Visitors may set only what the booking form sends. Everything else (status, created_at, tip,
--    paid_with, customer_id, vehicle_id, every card_* and stripe_* field, terms_agreed_at) is the database's or
--    Andrew's to set. id stays settable because the card hand-off names the booking before saving it.
revoke insert on public.bookings from anon;
grant insert (id, service, date, "time", name, phone, location, address, town, car, package, size, addons, total,
              source, notes, deal, discount, discount_amount, terms_version, email) on public.bookings to anon;

-- 2. Server-side rules for any booking that isn't Andrew's own (also covers a signed-in stranger):
--    the database decides when it was made and that it starts as Requested, there's no tip or payment on it yet,
--    it's at most 120 days out (the site only offers the next 4 weeks), and the whole site takes at most
--    40 website bookings an hour (Andrew gets a few a week; past 40 an hour it's a bot).
create or replace function public.guard_public_booking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_owner() then return new; end if;
  new.created_at := now();
  new.status := 'Requested';
  new.tip := 0;
  new.paid_with := null;
  if new.date > (now() at time zone 'America/New_York')::date + 120 then
    raise exception 'That date is too far ahead to book online. Please call or text Andrew.'
      using errcode = 'P0001', hint = 'too_far';
  end if;
  if (select count(*) from public.bookings b
       where b.created_at > now() - interval '1 hour' and b.status = 'Requested') >= 40 then
    raise exception 'Online booking is busy right now. Please call or text Andrew to book.'
      using errcode = 'P0001', hint = 'site_limit';
  end if;
  return new;
end $$;
revoke all on function public.guard_public_booking() from public, anon, authenticated;

-- Named to run first (triggers fire in name order), so the phone limit and alerts see the corrected row.
drop trigger if exists bookings_0_guard on public.bookings;
create trigger bookings_0_guard before insert on public.bookings
  for each row execute function public.guard_public_booking();

-- 3. The two older SECURITY DEFINER functions get an empty search_path like the rest (their names are qualified).
alter function public.is_owner() set search_path = '';
alter function public.busy_slots(date) set search_path = '';
