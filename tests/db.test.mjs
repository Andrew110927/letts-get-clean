// The database rules (customers, invoices, payments), checked against a real Postgres running in memory (PGlite)
// with the same migrations as the live project, so nothing here ever touches real data.
// Setup once:  npm install --no-save --no-package-lock @electric-sql/pglite@0.5.8
// Run:         node --test tests/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = [ // the order they were applied to the live project
  "20261024_bookings", "20261025_add_tip", "20261025_reviews_and_site_settings", "20261025_owner_app",
  "20261025_booking_alerts", "20261025_bikes_and_house_washing"
];
const OWNER = "11111111-1111-4111-8111-111111111111", STRANGER = "22222222-2222-4222-8222-222222222222";
const sql = (name) => readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");

// Just enough of Supabase for the migrations: its roles and default grants, auth.users / auth.uid(), and a do-nothing pg_net.
const SUPABASE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create schema extensions; create schema net;
  create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) returns bigint language sql as $$ select 1::bigint $$;
`;

let db;
// Runs as a website visitor (anon), the owner, or a signed-in stranger, then goes back to the superuser.
async function as(who, fn) {
  const role = who === "anon" ? "anon" : "authenticated", uid = who === "owner" ? OWNER : who === "stranger" ? STRANGER : "";
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);"); }
}
const rows = async (q, params) => (await db.query(q, params)).rows;
const one = async (q, params) => (await rows(q, params))[0];
const future = (days) => { const d = new Date(Date.now() + days * 864e5); return d.toISOString().slice(0, 10); };

async function invoice(over) {
  const o = { items: [{ name: "The Full Detail", qty: 1, unit_cents: 5000 }], subtotal: 5000, total: 5000, kind: "invoice", ...over };
  return one(`insert into public.invoices (kind, prefix, customer_id, items, subtotal_cents, discount_cents, tax_cents, tip_cents, total_cents)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
    [o.kind, o.kind === "quote" ? "Q-" : "LGC-", o.customer_id, JSON.stringify(o.items), o.subtotal, o.discount || 0, o.tax || 0, o.tip || 0, o.total]);
}
const pay = (invoice_id, cents, method) => one("insert into public.payments (invoice_id, amount_cents, method) values ($1, $2, $3) returning *", [invoice_id, cents, method || "Cash"]);

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE);
  for (const m of MIGRATIONS) {
    let text = await sql(m);
    if (m === "20261025_booking_alerts") text = text.replace(/create extension[^;]*;/, "");
    await db.exec(text);
  }
  await db.exec(`insert into auth.users values ('${OWNER}', 'owner@example.com', now()), ('${STRANGER}', 'someone@example.com', now());
    insert into public.owner_emails values ('owner@example.com');`);
  // Bookings made before the update: Ann twice (two cars, phone typed two ways, newer name spelling), Frank,
  // a house wash, and a test booking that was cancelled.
  await db.exec(`insert into public.bookings (status, date, "time", name, phone, address, town, car, service, created_at) values
    ('Done', '2026-10-20', '15:00', 'Ann Dubois', '(845) 555-0101', '1 Old Rd', 'Newburgh', 'SUV', 'car', '2026-10-19'),
    ('Done', '2026-10-24', '15:00', 'Ann DuBois', '845-555-0101', '14 Maple Ave', 'Newburgh', 'Truck', 'car', '2026-10-23'),
    ('Done', '2026-10-25', '17:00', 'Frank Damato', '8455550102', null, null, 'Black truck', 'car', '2026-10-24'),
    ('Confirmed', '2026-10-30', '15:00', 'Joe Baum', '+1 (845) 555-0103', '3 Lake Dr', 'Warwick', null, 'house', '2026-10-25'),
    ('Cancelled', '2026-11-03', '15:00', 'TEST booking', '(845) 555-0000', null, null, 'Test car', 'car', '2026-10-25');`);
  await db.exec(await sql("20261026_invoices"));
  await db.exec(await sql("20261026_booking_discounts"));
  await db.exec(await sql("20261029_trash_cans"));
});

test("existing bookings become one customer per phone, skipping cancelled-only people", async () => {
  const cs = await rows("select name, phone_key, address from public.customers order by phone_key");
  assert.deepEqual(cs.map(c => [c.name, c.phone_key, c.address]), [
    ["Ann DuBois", "8455550101", "14 Maple Ave"], ["Frank Damato", "8455550102", null], ["Joe Baum", "8455550103", "3 Lake Dr"]]);
  const linked = await rows("select b.name, c.name as customer from public.bookings b left join public.customers c on c.id = b.customer_id order by b.date");
  assert.deepEqual(linked.map(r => r.customer), ["Ann DuBois", "Ann DuBois", "Frank Damato", "Joe Baum", null]);
});

test("each different car a customer booked becomes a vehicle, and bookings point at it", async () => {
  const vs = await rows("select c.name, v.model from public.vehicles v join public.customers c on c.id = v.customer_id order by c.name, v.model");
  assert.deepEqual(vs.map(v => v.name + ": " + v.model), ["Ann DuBois: SUV", "Ann DuBois: Truck", "Frank Damato: Black truck"]);
  const unlinked = await one("select count(*)::int as n from public.bookings where car is not null and status <> 'Cancelled' and vehicle_id is null");
  assert.equal(unlinked.n, 0);
});

test("a website booking from a known phone is filed under that customer and their existing car", async () => {
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, car) values ($1, '15:00', 'Ann', '845.555.0101', 'truck')`, [future(23)]));
  const b = await one(`select c.name, v.model from public.bookings b join public.customers c on c.id = b.customer_id
    join public.vehicles v on v.id = b.vehicle_id where b.date = $1`, [future(23)]);
  assert.deepEqual(b, { name: "Ann DuBois", model: "Truck" });
  assert.equal((await one("select count(*)::int as n from public.vehicles")).n, 3);
});

test("a website booking from someone new creates the customer and their car", async () => {
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, address, town, car) values ($1, '17:00', ' Maria Lopez ', '(914) 555-0199', '9 Elm St', 'Goshen', 'Honda CR-V')`, [future(24)]));
  const c = await one("select c.name, c.address, v.model from public.customers c join public.vehicles v on v.customer_id = c.id where c.phone_key = '9145550199'");
  assert.deepEqual(c, { name: "Maria Lopez", address: "9 Elm St", model: "Honda CR-V" });
});

test("a blank name still books, filed under a customer called Customer", async () => {
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone) values ($1, '15:00', '   ', '(518) 555-0142')`, [future(27)]));
  assert.equal((await one("select c.name from public.bookings b join public.customers c on c.id = b.customer_id where b.date = $1", [future(27)])).name, "Customer");
});

test("a website visitor can't attach a booking to someone else's customer record", async () => {
  const ann = await one("select id from public.customers where phone_key = '8455550101'");
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, customer_id) values ($1, '15:00', 'Eve', '(212) 555-0177', $2)`, [future(25), ann.id]));
  const b = await one("select c.name from public.bookings b join public.customers c on c.id = b.customer_id where b.date = $1", [future(25)]);
  assert.equal(b.name, "Eve");
});

test("a booking the owner adds can name its customer directly", async () => {
  const frank = await one("select id from public.customers where phone_key = '8455550102'");
  await as("owner", () => db.query(`insert into public.bookings (status, date, "time", name, phone, customer_id) values ('Confirmed', $1, '15:00', 'Frank', '(000) 000-0000', $2)`, [future(26), frank.id]));
  assert.equal((await one("select customer_id from public.bookings where date = $1", [future(26)])).customer_id, frank.id);
});

test("only the owner can see or change customers, invoices and payments", async () => {
  for (const t of ["customers", "vehicles", "invoices", "payments", "invoice_settings"]) {
    await assert.rejects(as("anon", () => db.query(`select * from public.${t}`)), /permission denied/, t);
    assert.equal((await as("stranger", () => rows(`select * from public.${t}`))).length, 0, t);
    assert.equal((await as("stranger", () => db.query(`update public.${t} set id = id`))).affectedRows, 0, t);
  }
  assert.equal((await as("owner", () => rows("select * from public.customers"))).length, 6);
  await assert.rejects(as("anon", () => db.query("select * from public.invoice_counters")), /permission denied/);
});

test("nothing can be deleted, not even by the owner", async () => {
  for (const t of ["customers", "vehicles", "invoices", "payments"]) {
    await assert.rejects(as("owner", () => db.query(`delete from public.${t}`)), /permission denied/, t);
  }
});

test("invoices and quotes are numbered 1, 2, 3… separately, and numbers never change", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers where phone_key = '8455550102'");
    const a = await invoice({ customer_id: c.id }), b = await invoice({ customer_id: c.id }), q = await invoice({ customer_id: c.id, kind: "quote" });
    assert.deepEqual([a.number, b.number, q.number], [1, 2, 1]);
    assert.deepEqual([a.prefix, q.prefix, a.state], ["LGC-", "Q-", "draft"]);
    const changed = await one("update public.invoices set number = 99, kind = 'quote', prefix = 'X-', state = 'sent' where id = $1 returning number, kind, prefix, state", [a.id]);
    assert.deepEqual(changed, { number: 1, kind: "invoice", prefix: "LGC-", state: "sent" });
  });
});

test("a $0 invoice, or totals that don't add up, are refused", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    await assert.rejects(invoice({ customer_id: c.id, items: [{ name: "Free", qty: 1, unit_cents: 0 }], subtotal: 0, total: 0 }), /total_cents/);
    await assert.rejects(invoice({ customer_id: c.id, subtotal: 5000, discount: 1000, tip: 500, total: 5000 }), /check/);
    await assert.rejects(invoice({ customer_id: c.id, subtotal: 5000, discount: 6000, tip: 1500, total: 500 }), /check/);
    await assert.rejects(invoice({ customer_id: c.id, items: [] }), /items/);
    const ok = await invoice({ customer_id: c.id, subtotal: 5000, discount: 500, tax: 366, tip: 1000, total: 5866 });
    assert.equal(ok.total_cents, 5866);
  });
});

test("partial payments add up to the total and never past it", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    const inv = await invoice({ customer_id: c.id });
    await pay(inv.id, 2000, "Cash");
    await assert.rejects(pay(inv.id, 3001, "Venmo"), /more than the balance due/);
    await pay(inv.id, 3000, "Venmo");
    await assert.rejects(pay(inv.id, 1), /more than the balance due/);
    const paid = await one("select sum(amount_cents)::int as n from public.payments where invoice_id = $1", [inv.id]);
    assert.equal(paid.n, 5000);
    await assert.rejects(pay((await invoice({ customer_id: c.id })).id, 100, "Card"), /method/);
  });
});

test("a total can't drop below what's already paid; removing a payment frees the balance", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    const inv = await invoice({ customer_id: c.id });
    const p = await pay(inv.id, 4000);
    await assert.rejects(db.query("update public.invoices set items = $2, subtotal_cents = 3500, total_cents = 3500 where id = $1",
      [inv.id, JSON.stringify([{ name: "Interior", qty: 1, unit_cents: 3500 }])]), /less than what's already been paid/);
    await db.query("update public.payments set voided_at = now() where id = $1", [p.id]);
    await assert.rejects(db.query("update public.payments set amount_cents = 10 where id = $1", [p.id]), /was removed/);
    await db.query("update public.invoices set items = $2, subtotal_cents = 3500, total_cents = 3500 where id = $1", [inv.id, JSON.stringify([{ name: "Interior", qty: 1, unit_cents: 3500 }])]);
    await pay(inv.id, 3500);
  });
});

test("extra cash can be counted as a tip: raise the tip, then the payment fits", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    const inv = await invoice({ customer_id: c.id });
    await pay(inv.id, 2000);
    await assert.rejects(pay(inv.id, 4000), /more than the balance due/);
    await db.query("update public.invoices set tip_cents = 1000, total_cents = 6000 where id = $1", [inv.id]);
    await pay(inv.id, 4000);
    assert.equal((await one("select sum(amount_cents)::int as n from public.payments where invoice_id = $1 and voided_at is null", [inv.id])).n, 6000);
  });
});

test("quotes can't take payments", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    const q = await invoice({ customer_id: c.id, kind: "quote" });
    await assert.rejects(pay(q.id, 1000), /quote can't take payments/);
  });
});

test("voiding: not while payments stand, final once done, and a void invoice takes no payments", async () => {
  await as("owner", async () => {
    const c = await one("select id from public.customers limit 1");
    const inv = await invoice({ customer_id: c.id });
    const p = await pay(inv.id, 1000);
    await assert.rejects(db.query("update public.invoices set state = 'void' where id = $1", [inv.id]), /Remove them before voiding/);
    await db.query("update public.payments set voided_at = now() where id = $1", [p.id]);
    const v = await one("update public.invoices set state = 'void', void_reason = 'Customer cancelled' where id = $1 returning state, voided_at", [inv.id]);
    assert.equal(v.state, "void"); assert.ok(v.voided_at);
    await assert.rejects(db.query("update public.invoices set notes = 'x' where id = $1", [inv.id]), /void, so it can't be changed/);
    await assert.rejects(pay(inv.id, 500), /void, so it can't take payments/);
    await assert.rejects(db.query("insert into public.invoices (state, customer_id, items, subtotal_cents, total_cents) values ('void', $1, '[{}]', 100, 100)", [c.id]), /can't start out void/);
  });
});

test("the house wash rule still holds with customers attached", async () => {
  await as("owner", async () => {
    await db.query(`insert into public.bookings (status, date, "time", name, phone, service) values ('Confirmed', $1, '09:00', 'Joe', '(845) 555-0103', 'house')`, [future(30)]);
    await assert.rejects(db.query(`insert into public.bookings (status, date, "time", name, phone) values ('Confirmed', $1, '15:00', 'Ann', '(845) 555-0101')`, [future(30)]), /already booked/);
  });
  // The refused booking didn't leave a half-made customer behind.
  assert.equal((await one("select count(*)::int as n from public.customers")).n, 6);
});

test("visitors can book trash can cleaning, and only the known services are accepted", async () => {
  await as("anon", () => db.query(`insert into public.bookings (service, date, "time", name, phone, address, town, package, size, total)
    values ('trash', $1, '15:00', 'Pat', '(845) 555-0180', '5 Elm St', 'Newburgh', 'Trash can cleaning', '3 cans', 45)`, [future(70)]));
  const b = await one("select service, size, total, vehicle_id from public.bookings where date = $1", [future(70)]);
  assert.deepEqual(b, { service: "trash", size: "3 cans", total: 45, vehicle_id: null }, "no car, so no vehicle is made");
  // It takes its time slot like any other booking, and doesn't hold the whole day.
  await assert.rejects(as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone) values ($1, '15:00', 'Lee', '(845) 555-0181')`, [future(70)])), /duplicate key|unique/);
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone) values ($1, '17:00', 'Lee', '(845) 555-0181')`, [future(70)]));
  await assert.rejects(as("anon", () => db.query(`insert into public.bookings (service, date, "time", name, phone) values ('boat', $1, '13:30', 'Sal', '(845) 555-0182')`, [future(70)])), /bookings_service_check/);
});

// Last, and on dates no other test uses, because it adds customers the earlier tests count.
test("a website booking can say which discount it got; without one it's $0 off", async () => {
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, total, discount, discount_amount)
    values ($1, '15:00', 'Vet', '(845) 555-0160', 63, 'Military / first responder (10% off)', 7)`, [future(50)]));
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, total) values ($1, '17:00', 'Plain', '(845) 555-0161', 70)`, [future(50)]));
  const got = await rows("select name, total, discount, discount_amount from public.bookings where date = $1 order by name", [future(50)]);
  assert.deepEqual(got, [
    { name: "Plain", total: 70, discount: null, discount_amount: 0 },
    { name: "Vet", total: 63, discount: "Military / first responder (10% off)", discount_amount: 7 }]);
  await assert.rejects(as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, discount_amount) values ($1, '15:00', 'X', '(845) 555-0162', -5)`, [future(51)])));
  await assert.rejects(as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, discount) values ($1, '15:00', 'X', '(845) 555-0162', $2)`, [future(51), "x".repeat(81)])));
});

// The website sends a two-car visit as one request with both rows, which the API runs as a single insert.
const twoCars = (date) => as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone, car, package, total, discount, discount_amount, notes) values
  ($1, '15:00', 'Pat Two', '(845) 555-0170', 'Hyundai Sonata', 'The Full Detail', 50, null, 0, 'Car 1 of 2 (second car at 5 PM).'),
  ($1, '17:00', 'Pat Two', '(845) 555-0170', 'Honda CR-V', 'Exterior', 30, 'Two-car deal ($5 off the second car)', 5, 'Car 2 of 2 (first car at 3 PM).')`, [date]));

test("two cars booked together are filed under one customer, each car its own vehicle", async () => {
  await twoCars(future(60));
  const got = await rows(`select b."time", c.name, v.model, b.discount_amount from public.bookings b join public.customers c on c.id = b.customer_id
    join public.vehicles v on v.id = b.vehicle_id where b.date = $1 order by b."time"`, [future(60)]);
  assert.deepEqual(got.map(r => [r.time, r.name, r.model, r.discount_amount]), [["15:00", "Pat Two", "Hyundai Sonata", 0], ["17:00", "Pat Two", "Honda CR-V", 5]]);
  assert.equal((await one("select count(*)::int as n from public.customers where phone_key = '8455550170'")).n, 1);
});

test("two cars are saved together or not at all: if one slot is taken, neither is booked", async () => {
  await as("anon", () => db.query(`insert into public.bookings (date, "time", name, phone) values ($1, '17:00', 'Someone Else', '(845) 555-0171')`, [future(61)]));
  await assert.rejects(twoCars(future(61)), /bookings_slot_unique/);
  assert.equal((await one(`select count(*)::int as n from public.bookings where date = $1 and "time" = '15:00'`, [future(61)])).n, 0);
});
