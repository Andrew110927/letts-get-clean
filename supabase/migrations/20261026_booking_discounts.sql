-- Which discount a booking got, so Andrew sees it in LGC Pro. A booking gets one discount at most
-- (the biggest it qualifies for; the website and the app share the rules in app/discounts.js).
-- `total` stays what the customer pays, after the discount. Both columns are optional, so bookings
-- that don't send them (older pages, phone bookings) keep working.
alter table public.bookings
  add column discount text check (char_length(discount) <= 80),
  add column discount_amount integer not null default 0 check (discount_amount between 0 and 1000);
