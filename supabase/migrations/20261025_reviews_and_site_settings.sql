-- Reviews: anyone can post one; it only shows on the site after Andrew approves it in the dashboard.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stars int not null check (stars between 1 and 5),
  name text check (char_length(name) <= 40),
  text text not null check (char_length(text) between 4 and 800),
  approved boolean not null default false
);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant insert (stars, name, text) on public.reviews to anon;
grant select (stars, name, text, created_at) on public.reviews to anon;
create policy "public can post reviews" on public.reviews for insert to anon with check (approved = false);
create policy "public can read approved reviews" on public.reviews for select to anon using (approved);

-- Site settings: one row the dashboard edits and the public site reads (prices, hours, links, days off).
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon;
create policy "public can read site settings" on public.site_settings for select to anon using (true);

insert into public.site_settings (id, data) values (1, '{
  "phone": "(845) 282-9387",
  "dealEnds": "2026-11-16",
  "startDate": "2026-10-24",
  "slotsWeekday": ["15:00", "17:00"],
  "slotsWeekend": ["13:30", "17:30"],
  "daysOff": [],
  "packages": [
    {"id": "exterior", "name": "Exterior", "deal": 25, "regular": 35, "items": ["Hand wash & dry", "Wheels cleaned & tires shined", "Bug & road grime removed", "Windows & mirrors streak-free"]},
    {"id": "interior", "name": "Interior", "deal": 30, "regular": 40, "items": ["Vacuum seats, carpets & trunk", "Dash, console & door panels wiped", "Floor mats cleaned", "Cupholders & air vents detailed"]},
    {"id": "full", "name": "The Full Detail", "deal": 50, "regular": 70, "items": ["Everything in Exterior + Interior", "Inside and out, one visit", "Biggest savings"]}
  ],
  "sizes": [
    {"id": "car", "label": "Car / sedan", "price": 0},
    {"id": "suv", "label": "SUV / truck", "price": 10},
    {"id": "van", "label": "Minivan / 3-row", "price": 15}
  ],
  "addons": [
    {"id": "freshener", "label": "Air freshener", "price": 2},
    {"id": "heavy", "label": "Extra-dirty interior", "price": 10},
    {"id": "wax", "label": "Wax coat upgrade", "price": 20}
  ],
  "socials": {"instagram": "https://www.instagram.com/lettsgetclean", "tiktok": "https://www.tiktok.com/@lettsgetclean", "facebook": "", "google": ""}
}'::jsonb);
