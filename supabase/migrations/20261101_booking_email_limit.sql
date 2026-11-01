-- Optional email on website bookings, and a daily limit per phone number (spam protection).
-- Written 2026-11-01. NOT applied to the live project yet: apply only with Andrew's OK.

-- 1. Email is optional. When given, it must look like an email address, and it fills in the customer's email if blank.
alter table public.bookings add column if not exists email text
  check (email is null or (char_length(email) <= 120 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));

create or replace function public.link_booking_customer() returns trigger
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
        insert into public.customers (name, phone, email, address, town)
        values (coalesce(nullif(btrim(new.name), ''), 'Customer'), new.phone, new.email, new.address, new.town) returning id into new.customer_id;
      elsif new.email is not null then
        -- A known customer's email is only filled in when Andrew hasn't got one, never overwritten from the website.
        update public.customers c set email = new.email where c.id = new.customer_id and c.email is null;
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

-- 2. A phone number can make at most 4 website bookings in 24 hours (two two-car visits). The owner's app isn't limited.
create or replace function public.limit_bookings_per_phone() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare key text := public.phone_key(new.phone);
begin
  if public.is_owner() or key is null then return new; end if;
  if (select count(*) from public.bookings b
       where public.phone_key(b.phone) = key and b.created_at > now() - interval '1 day' and b.status <> 'Cancelled') >= 4 then
    raise exception 'This phone number has already booked a lot today. Please call or text Andrew to book more.'
      using errcode = 'P0001', hint = 'booking_limit';
  end if;
  return new;
end $$;
revoke all on function public.limit_bookings_per_phone() from public, anon, authenticated;
drop trigger if exists bookings_limit_per_phone on public.bookings;
create trigger bookings_limit_per_phone before insert on public.bookings
  for each row execute function public.limit_bookings_per_phone();

-- 3. Forgetting a customer also blanks the email on their bookings.
create or replace function public.forget_customer(cid uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare key text;
begin
  if not public.is_owner() then raise exception 'Only the owner can forget a customer.' using errcode = '42501'; end if;
  select c.phone_key into key from public.customers c where c.id = cid;
  if not found then raise exception 'That customer wasn''t found.'; end if;

  update public.bookings b
     set name = 'Deleted customer', phone = '0000000000', email = null, address = null, town = null, car = null, notes = null
   where b.customer_id = cid or (key is not null and public.phone_key(b.phone) = key);
  update public.vehicles v
     set year = null, make = null, model = 'Deleted vehicle', color = null, notes = null, archived = true
   where v.customer_id = cid;
  update public.invoices i set notes = null
   where i.customer_id = cid and i.state <> 'void' and i.notes is not null;
  update public.payments p set note = null
    from public.invoices i
   where p.invoice_id = i.id and i.customer_id = cid and i.state <> 'void' and p.voided_at is null and p.note is not null;
  update public.customers c
     set name = 'Deleted customer', phone = null, email = null, address = null, town = null, notes = null, archived = true
   where c.id = cid;
end $$;
revoke all on function public.forget_customer(uuid) from public, anon;
grant execute on function public.forget_customer(uuid) to authenticated;
