-- Owner app (app/): the signed-in owner can read and manage everything; visitors keep only what they had.
-- Owners are listed by login email. The email must be confirmed, so typing someone's address at sign-up isn't enough.
-- Add an owner (run once in the SQL editor, never commit real addresses):
--   insert into public.owner_emails (email) values ('owner@example.com');
create table public.owner_emails (
  email text primary key check (email = lower(email))
);
alter table public.owner_emails enable row level security;
revoke all on public.owner_emails from anon, authenticated;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from auth.users u join public.owner_emails o on o.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  )
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- Existing tables: owner gets full access; anon policies are unchanged.
grant select, insert, update, delete on public.bookings to authenticated;
create policy "owner manages bookings" on public.bookings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant select, update, delete on public.reviews to authenticated;
create policy "owner manages reviews" on public.reviews for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant select, insert, update on public.site_settings to authenticated;
create policy "owner edits site settings" on public.site_settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- How the customer paid, for the Money screen.
alter table public.bookings add column paid_with text check (paid_with in ('Cash', 'Cash App', 'Venmo', 'Card', 'Other'));

-- Social media post planner (moved here from the dashboard artifact's private store so the phone app can use it).
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_date date,
  platforms text[] not null default '{}' check (cardinality(platforms) <= 6),
  kind text check (char_length(kind) <= 30),
  visual text check (char_length(visual) <= 200),
  caption text not null check (char_length(caption) between 1 and 2200),
  hashtags text check (char_length(hashtags) <= 400),
  status text not null default 'Draft' check (status in ('Draft', 'Posted'))
);

-- Weekly follower counts, logged by hand until Metricool pulls them automatically.
create table public.social_stats (
  day date primary key,
  instagram int check (instagram >= 0),
  tiktok int check (tiktok >= 0),
  facebook int check (facebook >= 0),
  google int check (google >= 0)
);

-- Supplies, gas and other costs, so the Money screen can show profit, not just sales.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spent_on date not null default current_date,
  amount numeric(8, 2) not null check (amount > 0 and amount <= 10000),
  category text not null check (category in ('Supplies', 'Gas', 'Equipment', 'Marketing', 'Other')),
  note text check (char_length(note) <= 200)
);

do $$
declare t text;
begin
  foreach t in array array['social_posts', 'social_stats', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "owner only" on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;
