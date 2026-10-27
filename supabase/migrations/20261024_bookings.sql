-- Bookings from the website (applied 2026-10-24 as migration "bookings"; copied here from the live project).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'Requested' check (status in ('Requested','Confirmed','Done','Cancelled')),
  date date not null,
  "time" text not null check ("time" ~ '^\d{2}:\d{2}$'),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 10 and 30),
  location text not null default 'mobile' check (location in ('mobile','dropoff')),
  address text check (char_length(address) <= 150),
  town text check (char_length(town) <= 60),
  car text check (char_length(car) <= 80),
  package text check (char_length(package) <= 40),
  size text check (char_length(size) <= 40),
  addons text check (char_length(addons) <= 150),
  total integer check (total between 0 and 1000),
  source text check (char_length(source) <= 30),
  notes text check (char_length(notes) <= 500),
  deal boolean default false
);

create unique index bookings_slot_unique on public.bookings (date, "time") where status <> 'Cancelled';

alter table public.bookings enable row level security;

create policy "public can request bookings" on public.bookings
  for insert to anon
  with check (status = 'Requested' and date >= (now() at time zone 'America/New_York')::date);

create or replace function public.busy_slots(from_date date default current_date)
returns table (slot_date date, slot_time text)
language sql stable security definer set search_path = public as $$
  select b.date, b."time" from public.bookings b
  where b.status <> 'Cancelled' and b.date >= from_date
$$;
revoke all on function public.busy_slots(date) from public;
grant execute on function public.busy_slots(date) to anon, authenticated;

revoke all on public.bookings from anon, authenticated;
grant insert on public.bookings to anon;
