-- Bike details and house pressure washing.
-- A house wash takes the whole day: it can only be booked on a day with nothing else on it,
-- and once it's booked nothing else can be booked that day. The database enforces this, so two
-- people booking at the same moment can't both get the day.

-- Existing rows and older copies of the website keep working: anything without a service is a car.
alter table public.bookings add column service text not null default 'car' check (service in ('car', 'bike', 'house'));

-- busy_slots also says whether a booking holds the whole day, so the website can grey the day out.
-- The return type changes, so it has to be dropped and created again (same access as before).
drop function public.busy_slots(date);
create function public.busy_slots(from_date date default current_date)
returns table(slot_date date, slot_time text, all_day boolean)
language sql stable security definer set search_path = public
as $$
  select b.date, b."time", b.service = 'house' from public.bookings b
  where b.status <> 'Cancelled' and b.date >= from_date
$$;
revoke all on function public.busy_slots(date) from public;
grant execute on function public.busy_slots(date) to anon, authenticated, service_role;

-- Security definer so it sees every booking, not just the ones the caller may read.
create function public.check_whole_day() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'Cancelled' then return new; end if;
  -- One booking per day at a time gets past this point, so two at once can't both pass the check.
  perform pg_advisory_xact_lock(hashtext('lgc-booking-day'), hashtext(new.date::text));
  if exists (
    select 1 from public.bookings b
    where b.date = new.date and b.status <> 'Cancelled' and b.id <> new.id
      and (new.service = 'house' or b.service = 'house')
  ) then
    -- 23505 is what the website and app already treat as "that time is taken".
    raise exception 'That day is already booked' using errcode = '23505', hint = 'A house wash needs the whole day to itself.';
  end if;
  return new;
end $$;
revoke all on function public.check_whole_day() from public, anon, authenticated;

create trigger bookings_whole_day before insert or update of date, "time", service, status on public.bookings
  for each row execute function public.check_whole_day();
