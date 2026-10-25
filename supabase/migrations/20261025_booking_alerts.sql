-- Booking alerts: the owner's phone buzzes (Web Push) when a customer books on the website, even with the app closed.
-- The app saves each phone's push subscription here. A trigger on new bookings calls the booking-push Edge Function
-- (supabase/functions/booking-push), which sends the alert to every saved phone.
-- After applying: deploy that function with verify_jwt off and set its VAPID_PRIVATE_KEY secret (README "Booking alerts").

-- pg_net makes the HTTP call in the background, so the customer's booking never waits on it.
create extension if not exists pg_net with schema extensions;

-- One row per phone (or browser) with alerts turned on. endpoint is that device's push address from its browser.
create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 80 and 100),
  auth text not null check (char_length(auth) between 16 and 30),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
create policy "owner only" on public.push_subscriptions for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Website bookings only: one the owner adds in the app doesn't buzz their own phone.
-- Sends just the id; the function re-reads the booking itself rather than trusting the caller.
-- The URL is this project's (public) address; change it when reusing the app for another business.
create function public.alert_new_booking() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_owner() then return new; end if;
  perform net.http_post(
    url := 'https://fisenrazdvnobzjpihti.supabase.co/functions/v1/booking-push',
    body := jsonb_build_object('booking_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  -- A problem with the alert must never cost a booking.
  raise warning 'booking alert not sent: %', sqlerrm;
  return new;
end $$;
revoke all on function public.alert_new_booking() from public, anon, authenticated;

create trigger alert_new_booking after insert on public.bookings
  for each row execute function public.alert_new_booking();
