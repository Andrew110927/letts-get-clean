-- Invoices for the owner app: customer records, vehicles, invoices, quotes and payments.
-- Owner-only, like the rest of the app. Nothing here can be deleted: customers and vehicles are archived,
-- invoices and payments are voided, so the money records always stay complete.
-- Money is stored in whole cents (5000 = $50.00) so totals never pick up rounding errors.

-- Phones are matched on their last 10 digits, so "(845) 555-0101" and "845-555-0101" are the same person.
create function public.phone_key(p text) returns text
language sql immutable set search_path = ''
as $$ select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10), '') $$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text check (char_length(phone) <= 30),
  phone_key text generated always as (public.phone_key(phone)) stored,
  email text check (char_length(email) <= 120),
  address text check (char_length(address) <= 150),
  town text check (char_length(town) <= 60),
  notes text check (char_length(notes) <= 1000),
  archived boolean not null default false
);
create index customers_phone_key on public.customers (phone_key);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.customers (id),
  year int check (year between 1950 and 2100),
  make text check (char_length(make) <= 40),
  model text check (char_length(model) <= 80),
  color text check (char_length(color) <= 30),
  notes text check (char_length(notes) <= 200),
  archived boolean not null default false,
  check (nullif(btrim(coalesce(make, '') || coalesce(model, '')), '') is not null)
);
create index vehicles_customer on public.vehicles (customer_id);

alter table public.bookings
  add column customer_id uuid references public.customers (id),
  add column vehicle_id uuid references public.vehicles (id);
create index bookings_customer on public.bookings (customer_id);

-- Invoice and quote numbers come from the database, so two phones can never hand out the same one.
-- The counter only moves when an invoice is actually saved, so no numbers are skipped.
create table public.invoice_counters (
  kind text primary key check (kind in ('invoice', 'quote')),
  last_number int not null default 0 check (last_number >= 0)
);
insert into public.invoice_counters (kind) values ('invoice'), ('quote');

-- An invoice or a quote. Only Draft, Sent and Void are stored: Paid, Partially Paid and Overdue are worked out
-- from the payments and the due date, so they can never be out of date.
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null default 'invoice' check (kind in ('invoice', 'quote')),
  number int not null default 0,
  prefix text not null default '' check (char_length(prefix) <= 10),
  state text not null default 'draft' check (state in ('draft', 'sent', 'void')),
  customer_id uuid not null references public.customers (id),
  vehicle_id uuid references public.vehicles (id),
  booking_id uuid references public.bookings (id),
  quote_id uuid references public.invoices (id),
  issued_on date not null default current_date,
  job_date date,
  due_on date,
  location text not null default 'mobile' check (location in ('mobile', 'dropoff')),
  -- Line items: [{ "name": "The Full Detail", "qty": 1, "unit_cents": 5000, "ref": "full" }, ...]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  subtotal_cents int not null check (subtotal_cents between 0 and 10000000),
  discount_percent numeric(5, 2) check (discount_percent between 0 and 100),
  discount_cents int not null default 0 check (discount_cents >= 0),
  tax_percent numeric(6, 3) not null default 0 check (tax_percent between 0 and 25),
  tax_cents int not null default 0 check (tax_cents >= 0),
  tip_cents int not null default 0 check (tip_cents between 0 and 1000000),
  total_cents int not null check (total_cents between 1 and 10000000),
  notes text check (char_length(notes) <= 1000),
  voided_at timestamptz,
  void_reason text check (char_length(void_reason) <= 200),
  unique (kind, number),
  check (discount_cents <= subtotal_cents),
  check (total_cents = subtotal_cents - discount_cents + tax_cents + tip_cents),
  check ((state = 'void') = (voided_at is not null))
);
create index invoices_customer on public.invoices (customer_id);
create index invoices_booking on public.invoices (booking_id);

-- A payment toward an invoice. Several partial payments can add up to the total, never past it.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_id uuid not null references public.invoices (id),
  paid_on date not null default current_date,
  amount_cents int not null check (amount_cents between 1 and 10000000),
  method text not null check (method in ('Cash', 'Cash App', 'Venmo', 'Other')),
  note text check (char_length(note) <= 200),
  voided_at timestamptz
);
create index payments_invoice on public.payments (invoice_id);

-- Invoice settings: business details printed on invoices, payment handles, tax, numbering, logo and colors.
-- Kept apart from site_settings because that row is public (the website reads it); this one is owner-only.
create table public.invoice_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 500000),
  updated_at timestamptz not null default now()
);
insert into public.invoice_settings (id) values (1);

-- Invoice rules: numbering on create; numbers, kind and prefix never change; a void invoice is final;
-- an invoice can't be voided while it still has payments, or lowered below what's already been paid.
create function public.invoice_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare paid int;
begin
  if tg_op = 'INSERT' then
    if new.state = 'void' then raise exception 'A new invoice can''t start out void.'; end if;
    update public.invoice_counters set last_number = last_number + 1 where kind = new.kind returning last_number into new.number;
    new.created_at := now();
  else
    if old.state = 'void' then raise exception 'This invoice is void, so it can''t be changed. Duplicate it instead.'; end if;
    new.number := old.number; new.kind := old.kind; new.prefix := old.prefix; new.created_at := old.created_at;
    select coalesce(sum(p.amount_cents), 0) into paid from public.payments p where p.invoice_id = new.id and p.voided_at is null;
    if new.state = 'void' and paid > 0 then raise exception 'This invoice has payments. Remove them before voiding it.'; end if;
    if paid > new.total_cents then raise exception 'The new total is less than what''s already been paid.'; end if;
  end if;
  new.voided_at := case when new.state = 'void' then coalesce(new.voided_at, now()) end;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.invoice_rules() from public, anon, authenticated;
create trigger invoices_rules before insert or update on public.invoices
  for each row execute function public.invoice_rules();

-- Payment rules: only real invoices take payments, and payments never add up past the total.
create function public.payment_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare inv public.invoices; paid int;
begin
  if tg_op = 'UPDATE' then
    if old.voided_at is not null then raise exception 'This payment was removed, so it can''t be changed.'; end if;
    new.invoice_id := old.invoice_id; new.created_at := old.created_at;
  end if;
  -- Lock the invoice so two payments saved at the same moment can't both slip past the balance check.
  select * into inv from public.invoices i where i.id = new.invoice_id for update;
  if new.voided_at is null then
    if inv.kind <> 'invoice' then raise exception 'A quote can''t take payments. Turn it into an invoice first.'; end if;
    if inv.state = 'void' then raise exception 'This invoice is void, so it can''t take payments.'; end if;
    select coalesce(sum(p.amount_cents), 0) into paid from public.payments p
      where p.invoice_id = new.invoice_id and p.voided_at is null and p.id <> new.id;
    if paid + new.amount_cents > inv.total_cents then
      raise exception 'That''s more than the balance due. Add the extra to the invoice as a tip first.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.payment_rules() from public, anon, authenticated;
create trigger payments_rules before insert or update on public.payments
  for each row execute function public.payment_rules();

-- Owner only, and no deleting: there's no delete grant on any of these tables.
do $$
declare t text;
begin
  foreach t in array array['customers', 'vehicles', 'invoices', 'payments', 'invoice_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('create policy "owner only" on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;
-- Only the triggers above touch the counters.
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

-- Customers from the bookings so far, one per phone number. The newest booking's name and address win.
-- People whose only bookings were cancelled are skipped.
insert into public.customers (name, phone, address, town, created_at)
select distinct on (k) b.name, b.phone, b.address, b.town, min(b.created_at) over (partition by k)
from (select *, public.phone_key(phone) as k from public.bookings where status <> 'Cancelled') b
where k is not null
order by k, b.date desc, b."time" desc;

update public.bookings b set customer_id = c.id
from public.customers c where c.phone_key = public.phone_key(b.phone);

-- One vehicle per different car each customer has booked. The booking's text goes in as the model
-- ("Infiniti G37"); year, make and color can be filled in later in the app.
insert into public.vehicles (customer_id, model, created_at)
select distinct on (b.customer_id, lower(btrim(b.car))) b.customer_id, btrim(b.car), b.created_at
from public.bookings b
where b.customer_id is not null and nullif(btrim(b.car), '') is not null and b.service <> 'house'
order by b.customer_id, lower(btrim(b.car)), b.created_at;

update public.bookings b set vehicle_id = v.id
from public.vehicles v where v.customer_id = b.customer_id and lower(v.model) = lower(btrim(b.car));

-- New bookings (website or app) are filed under their customer by phone number, and their car under that
-- customer's vehicles. Someone new becomes a customer automatically. Website visitors can't pick the customer.
create function public.link_booking_customer() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  key text := public.phone_key(new.phone);
  car text := nullif(btrim(coalesce(new.car, '')), '');
begin
  if not public.is_owner() then new.customer_id := null; new.vehicle_id := null; end if;
  begin
    if new.customer_id is null and key is not null then
      select c.id into new.customer_id from public.customers c
        where c.phone_key = key and not c.archived order by c.created_at limit 1;
      if new.customer_id is null then
        insert into public.customers (name, phone, address, town)
        values (coalesce(nullif(btrim(new.name), ''), 'Customer'), new.phone, new.address, new.town) returning id into new.customer_id;
      end if;
    end if;
    if new.vehicle_id is null and new.customer_id is not null and car is not null and new.service <> 'house' then
      select v.id into new.vehicle_id from public.vehicles v
        where v.customer_id = new.customer_id and not v.archived
          and lower(car) in (lower(coalesce(v.model, '')), lower(concat_ws(' ', v.make, v.model)),
                             lower(concat_ws(' ', v.year, v.make, v.model)), lower(concat_ws(' ', v.year, v.color, v.make, v.model)))
        order by v.created_at limit 1;
      if new.vehicle_id is null then
        insert into public.vehicles (customer_id, model) values (new.customer_id, car) returning id into new.vehicle_id;
      end if;
    end if;
  exception when others then
    -- Filing it under a customer must never cost a booking: save it unlinked, and the app can link it later.
    raise warning 'booking not linked to a customer: %', sqlerrm;
    new.customer_id := null; new.vehicle_id := null;
  end;
  return new;
end $$;
revoke all on function public.link_booking_customer() from public, anon, authenticated;
create trigger bookings_link_customer before insert on public.bookings
  for each row execute function public.link_booking_customer();
