-- Privacy: a record of which terms each website booking agreed to, and a way to honor "delete my data".
-- Written 2026-10-31; NOT applied to the live project until Andrew approves it.

-- Which version of the terms the customer ticked when they booked. The time comes from the database clock,
-- so a visitor can send the version but can't backdate when they agreed.
alter table public.bookings
  add column terms_version text check (char_length(terms_version) <= 20),
  add column terms_agreed_at timestamptz;

create function public.stamp_terms() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.terms_agreed_at := case when new.terms_version is not null then now() end;
  return new;
end $$;
revoke all on function public.stamp_terms() from public, anon, authenticated;
create trigger bookings_stamp_terms before insert on public.bookings
  for each row execute function public.stamp_terms();

-- "Forget this customer": blanks their name, phone, email, address, car and notes everywhere they appear
-- (the customer card, their vehicles, their bookings, the notes on their invoices and payments), while each
-- job's date, service and amount stay for the tax records. Bookings made before they were filed under the
-- customer are matched by phone number too. Void invoices and removed payments stay as they are, because the
-- invoice rules make them final. Owner only; nothing is deleted, so every money total stays the same.
create function public.forget_customer(cid uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare key text;
begin
  if not public.is_owner() then raise exception 'Only the owner can forget a customer.' using errcode = '42501'; end if;
  select c.phone_key into key from public.customers c where c.id = cid;
  if not found then raise exception 'That customer wasn''t found.'; end if;

  update public.bookings b
     set name = 'Deleted customer', phone = '0000000000', address = null, town = null, car = null, notes = null
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
