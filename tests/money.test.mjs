// Pricing and invoice math (app/core.js). Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGC from "../app/core.js";

// Andrew's real price list: launch prices through Nov 16, 2026, regular from Nov 17.
const ST = {
  dealEnds: "2026-11-16",
  packages: [
    { id: "exterior", name: "Exterior", deal: 25, regular: 35 },
    { id: "interior", name: "Interior", deal: 30, regular: 40 },
    { id: "full", name: "The Full Detail", deal: 50, regular: 70 }
  ],
  sizes: [{ id: "car", label: "Car / sedan", price: 0 }, { id: "suv", label: "SUV / truck", price: 10 }, { id: "van", label: "Minivan / 3-row", price: 15 }],
  addons: [{ id: "freshener", label: "Air freshener", price: 2 }, { id: "heavy", label: "Extra-dirty interior", price: 10 }, { id: "wax", label: "Wax coat upgrade", price: 20 }],
  bike: { price: 20 }, house: { price: 300 }, trash: { price: 15 }
};
const NAMES = { bike: "Bike detail", house: "Full house pressure wash", trash: "Trash can cleaning" };
const pkg = (id) => ST.packages.find(p => p.id === id);
const inv = (o) => ({ customer_id: "c1", items: [{ name: "The Full Detail", qty: 1, unit_cents: 5000 }], tip_cents: 0, discount_cents: 0, tax_percent: 0, ...o });

test("launch prices through Nov 16, regular prices from Nov 17", () => {
  const prices = (day) => ST.packages.map(p => LGC.priceFor(p, day, ST.dealEnds));
  assert.deepEqual(prices("2026-10-26"), [25, 30, 50]);
  assert.deepEqual(prices("2026-11-16"), [25, 30, 50], "the last day of the deal is still launch price");
  assert.deepEqual(prices("2026-11-17"), [35, 40, 70], "the day after switches to regular");
  assert.deepEqual(prices("2027-03-01"), [35, 40, 70]);
});

test("with no deal end date, everything is regular price", () => {
  assert.equal(LGC.priceFor(pkg("full"), "2026-10-26", ""), 70);
  assert.equal(LGC.priceFor(pkg("full"), "2026-10-26", null), 70);
  assert.equal(LGC.dealFor("", "2026-11-16"), false, "no job date, no deal");
});

test("money shows as dollars and cents, and typed amounts become cents", () => {
  assert.equal(LGC.fmtCents(5000), "$50.00");
  assert.equal(LGC.fmtCents(123456), "$1,234.56");
  assert.equal(LGC.fmtCents(5), "$0.05");
  assert.equal(LGC.fmtCents(-250), "-$2.50");
  assert.equal(LGC.toCents("50"), 5000);
  assert.equal(LGC.toCents("49.5"), 4950);
  assert.equal(LGC.toCents("$1,200.29"), 120029);
  assert.equal(LGC.toCents("0.29"), 29, "no floating-point drift");
  assert.equal(LGC.toCents(".5"), 50);
  for (const bad of ["", "abc", "-5", "1.234", "5..0", "."]) assert.ok(Number.isNaN(LGC.toCents(bad)), bad);
});

test("totals: lines times quantity, then discount, then tax on the discounted amount, then the tip (never taxed)", () => {
  const t = LGC.invoiceTotals(inv({
    items: [{ name: "Exterior", qty: 2, unit_cents: 3500 }, { name: "SUV / truck size", qty: 1, unit_cents: 1000 }],
    discount_percent: 10, tax_percent: 8.125, tip_cents: 1000
  }));
  // 2 × $35 + $10 = $80; 10% off = $8; tax 8.125% of $72 = $5.85; tip $10.
  assert.deepEqual(t, { subtotal: 8000, discount: 800, tax: 585, tip: 1000, total: 8785 });
});

test("percent discounts and tax round to the nearest cent, half up", () => {
  // 15% of $33.33 = $4.9995 → $5.00
  assert.equal(LGC.invoiceTotals(inv({ items: [{ name: "x", qty: 1, unit_cents: 3333 }], discount_percent: 15 })).discount, 500);
  // 8.125% of $45.00 = $3.65625 → $3.66
  assert.equal(LGC.invoiceTotals(inv({ items: [{ name: "x", qty: 1, unit_cents: 4500 }], tax_percent: 8.125 })).tax, 366);
  // 8.125% of $40.00 = $3.25 exactly
  assert.equal(LGC.invoiceTotals(inv({ items: [{ name: "x", qty: 1, unit_cents: 4000 }], tax_percent: 8.125 })).tax, 325);
  // 12.5% off $0.04 = half a cent → rounds up to 1¢
  assert.equal(LGC.invoiceTotals(inv({ items: [{ name: "x", qty: 1, unit_cents: 4 }], discount_percent: 12.5 })).discount, 1);
});

test("a fixed-dollar discount comes off before tax", () => {
  const t = LGC.invoiceTotals(inv({ items: [{ name: "x", qty: 1, unit_cents: 7000 }], discount_cents: 2000, tax_percent: 10, tip_cents: 500 }));
  assert.deepEqual(t, { subtotal: 7000, discount: 2000, tax: 500, tip: 500, total: 6000 });
});

test("totals always add up the way the database checks them", () => {
  for (const o of [{ discount_percent: 33.33, tax_percent: 8.125, tip_cents: 777 }, { discount_cents: 1234, tax_percent: 7, tip_cents: 1 }, {}]) {
    const t = LGC.invoiceTotals(inv({ items: [{ name: "a", qty: 3, unit_cents: 2999 }, { name: "b", qty: 1, unit_cents: 1501 }], ...o }));
    assert.equal(t.total, t.subtotal - t.discount + t.tax + t.tip);
  }
});

test("a $0 invoice is refused, even after a 100% discount", () => {
  assert.match(LGC.invoiceProblems(inv({ items: [{ name: "Free wash", qty: 1, unit_cents: 0 }] })).join(), /\$0/);
  assert.match(LGC.invoiceProblems(inv({ discount_percent: 100 })).join(), /\$0/);
  // ...but a 100% discount with a tip still charges something.
  assert.deepEqual(LGC.invoiceProblems(inv({ discount_percent: 100, tip_cents: 500 })), []);
});

test("a total can't go negative: a discount bigger than the services is refused", () => {
  assert.match(LGC.invoiceProblems(inv({ discount_cents: 6000 })).join(), /discount is bigger/);
  assert.match(LGC.invoiceProblems(inv({ discount_cents: -100 })).join(), /can't be negative/);
  assert.match(LGC.invoiceProblems(inv({ tip_cents: -100 })).join(), /tip can't be negative/);
  assert.match(LGC.invoiceProblems(inv({ discount_percent: 120 })).join(), /between 0 and 100/);
  assert.match(LGC.invoiceProblems(inv({ items: [{ name: "x", qty: 1, unit_cents: -500 }] })).join(), /price from \$0/);
});

test("every line needs a description, a quantity of 1–99 and a price; there must be a customer and a line", () => {
  assert.match(LGC.invoiceProblems(inv({ items: [{ name: " ", qty: 1, unit_cents: 100 }] })).join(), /Line 1 needs a description/);
  assert.match(LGC.invoiceProblems(inv({ items: [{ name: "x", qty: 0, unit_cents: 100 }] })).join(), /quantity/);
  assert.match(LGC.invoiceProblems(inv({ items: [{ name: "x", qty: 1.5, unit_cents: 100 }] })).join(), /quantity/);
  assert.match(LGC.invoiceProblems(inv({ items: [] })).join(), /at least one service/);
  assert.match(LGC.invoiceProblems(inv({ customer_id: null })).join(), /customer/);
  assert.deepEqual(LGC.invoiceProblems(inv({})), []);
});

test("a launch-deal booking is invoiced at the launch price, even when the job is after Nov 16", () => {
  const b = { service: "car", package: "The Full Detail", size: "SUV / truck", addons: "Air freshener, Wax coat upgrade", total: 82, deal: true, date: "2026-11-20" };
  assert.deepEqual(LGC.linesFromBooking(b, ST, NAMES).map(l => [l.name, l.unit_cents]),
    [["The Full Detail", 5000], ["SUV / truck size", 1000], ["Air freshener", 200], ["Wax coat upgrade", 2000]]);
});

test("a regular-price booking uses regular prices, and a sedan adds no size line", () => {
  const b = { service: "car", package: "Exterior", size: "Car / sedan", addons: null, total: 35, deal: false };
  assert.deepEqual(LGC.linesFromBooking(b, ST, NAMES).map(l => [l.ref, l.unit_cents]), [["pkg:exterior", 3500]]);
});

test("if the booking total was changed by hand, the invoice still matches it", () => {
  const b = { service: "car", package: "Interior", size: "SUV / truck", addons: null, total: 45, deal: true }; // $30 + $10 = $40 listed, $45 agreed
  const lines = LGC.linesFromBooking(b, ST, NAMES);
  assert.equal(lines.reduce((n, l) => n + l.unit_cents * l.qty, 0), 4500);
  assert.deepEqual(lines.map(l => l.unit_cents), [3500, 1000]);
  // Knocked down below the extras: one line at the agreed price.
  const low = LGC.linesFromBooking({ ...b, addons: "Wax coat upgrade", total: 20 }, ST, NAMES);
  assert.deepEqual(low.map(l => [l.name, l.unit_cents]), [["Interior", 2000]]);
});

test("a booking with a website discount is invoiced at full price, with the discount taken off separately", () => {
  // Military 10% on a $50 Full Detail: the booking says total $45, discount_amount $5.
  const b = { service: "car", package: "The Full Detail", size: "Car / sedan", addons: null, total: 45, discount_amount: 5, discount: "Military 10% off", deal: true };
  const items = LGC.linesFromBooking(b, ST, NAMES);
  assert.deepEqual(items.map(l => [l.name, l.unit_cents]), [["The Full Detail", 5000]]);
  const t = LGC.invoiceTotals({ items, discount_cents: 500, tax_percent: 0, tip_cents: 0 });
  assert.equal(t.total, 4500, "the invoice still comes to what the booking said");
  assert.deepEqual(LGC.linesFromBooking({ service: "house", total: 270, discount_amount: 30 }, ST, NAMES).map(l => l.unit_cents), [30000]);
});

test("bike and house bookings become one line at their booked price", () => {
  assert.deepEqual(LGC.linesFromBooking({ service: "bike", size: "E-bike", total: 20 }, ST, NAMES), [{ ref: "svc:bike", name: "Bike detail · E-bike", qty: 1, unit_cents: 2000 }]);
  assert.deepEqual(LGC.linesFromBooking({ service: "house", size: "House", total: 300 }, ST, NAMES), [{ ref: "svc:house", name: "Full house pressure wash", qty: 1, unit_cents: 30000 }]);
});

test("a trash can booking becomes one line per can at the booked price", () => {
  assert.deepEqual(LGC.linesFromBooking({ service: "trash", size: "3 cans", total: 45 }, ST, NAMES), [{ ref: "svc:trash", name: "Trash can cleaning", qty: 3, unit_cents: 1500 }]);
  assert.deepEqual(LGC.linesFromBooking({ service: "trash", size: "1 can", total: 0 }, ST, NAMES), [{ ref: "svc:trash", name: "Trash can cleaning", qty: 1, unit_cents: 1500 }], "no total: today's price");
  // A website discount is added back onto the lines; the invoice carries it separately.
  assert.deepEqual(LGC.linesFromBooking({ service: "trash", size: "2 cans", total: 27, discount_amount: 3 }, ST, NAMES).map(l => [l.qty, l.unit_cents]), [[2, 1500]]);
  // A total changed to something that doesn't split evenly stays one line, so the invoice still matches it.
  assert.deepEqual(LGC.linesFromBooking({ service: "trash", size: "3 cans", total: 40 }, ST, NAMES), [{ ref: "svc:trash", name: "Trash can cleaning · 3 cans", qty: 1, unit_cents: 4000 }]);
});

test("invoice numbers are the prefix and four digits", () => {
  assert.equal(LGC.invoiceNumber({ prefix: "LGC-", number: 1 }), "LGC-0001");
  assert.equal(LGC.invoiceNumber({ prefix: "Q-", number: 12345 }), "Q-12345");
  assert.equal(LGC.invoiceNumber({ prefix: "LGC-", number: 0 }), "New");
});

test("statuses: Draft, Sent, Overdue the day after it's due, Partially Paid, Paid, Void", () => {
  const sent = { kind: "invoice", state: "sent", total_cents: 5000, due_on: "2026-11-02" };
  assert.equal(LGC.invoiceStatus({ ...sent, state: "draft" }, 0, "2026-12-01"), "Draft", "a draft is never overdue");
  assert.equal(LGC.invoiceStatus(sent, 0, "2026-11-02"), "Sent", "due today isn't overdue yet");
  assert.equal(LGC.invoiceStatus(sent, 0, "2026-11-03"), "Overdue");
  assert.equal(LGC.invoiceStatus(sent, 2000, "2026-11-03"), "Partially Paid");
  assert.equal(LGC.invoiceStatus(sent, 5000, "2026-11-03"), "Paid");
  assert.equal(LGC.invoiceStatus({ ...sent, state: "void" }, 0, "2026-11-03"), "Void");
  assert.equal(LGC.invoiceStatus({ kind: "quote", state: "sent" }, 0, "2026-11-03", true), "Converted");
  assert.equal(LGC.invoiceStatus({ kind: "quote", state: "draft" }, 0, "2026-11-03"), "Draft");
});

test("due dates count calendar days, across months and daylight saving", () => {
  assert.equal(LGC.addDays("2026-10-26", 7), "2026-11-02");
  assert.equal(LGC.addDays("2026-12-28", 7), "2027-01-04");
  assert.equal(LGC.addDays("2026-03-07", 1), "2026-03-08");
});

test("invoice settings keep good values and ignore bad ones", () => {
  const base = { businessName: "Letts Get Clean", email: "", cashApp: "$AndrewLetta", venmo: "@Andrew-Letts-9", taxPercent: 0, invoicePrefix: "LGC-", quotePrefix: "Q-", overdueDays: 7 };
  const s = LGC.mergeInvoiceSettings(base, { email: "aj@example.com", taxPercent: "8.125", overdueDays: "14", invoicePrefix: "INV-" });
  assert.deepEqual([s.email, s.taxPercent, s.overdueDays, s.invoicePrefix], ["aj@example.com", 8.125, 14, "INV-"]);
  const bad = LGC.mergeInvoiceSettings(base, { email: "nope", taxPercent: 40, overdueDays: -1, invoicePrefix: "<b>", cashApp: "AndrewLetta", venmo: "venmo me" });
  assert.deepEqual([bad.email, bad.taxPercent, bad.overdueDays, bad.invoicePrefix, bad.cashApp, bad.venmo], ["", 0, 7, "LGC-", "$AndrewLetta", "@Andrew-Letts-9"]);
  assert.deepEqual(LGC.mergeInvoiceSettings(base, null), base);
});
