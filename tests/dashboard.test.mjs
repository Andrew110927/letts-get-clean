// Money dashboard math (app/core.js): what came in, finished jobs, and who still owes. Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGC from "../app/core.js";

const ST = { packages: [{ id: "exterior", name: "Exterior" }, { id: "interior", name: "Interior" }, { id: "full", name: "The Full Detail" }] };
const NAMES = { bike: "Bike detail", house: "Full house pressure wash", trash: "Trash can cleaning" };
const inv = (o) => ({ id: "i" + Math.random().toString(36).slice(2), kind: "invoice", state: "sent", number: 1, customer_id: "c1", booking_id: null, total_cents: 5000, tip_cents: 0,
  issued_on: "2026-10-20", job_date: "2026-10-20", due_on: "2026-10-27", items: [{ ref: "pkg:full", name: "The Full Detail", qty: 1, unit_cents: 5000 }], ...o });
const pay = (invoice, cents, on, o) => ({ id: "p" + Math.random().toString(36).slice(2), invoice_id: invoice.id, amount_cents: cents, paid_on: on, method: "Cash", voided_at: null, created_at: on + "T18:00:00Z", ...o });
const booking = (o) => ({ id: "b" + Math.random().toString(36).slice(2), status: "Done", date: "2026-10-10", total: 50, tip: 0, paid_with: "Cash", package: "The Full Detail", service: "car", customer_id: "c1", ...o });

test("money in is each payment, on the day it was paid", () => {
  const a = inv({ total_cents: 6000 }), b = inv({ total_cents: 3500 });
  const rows = LGC.moneyIn([a, b], [pay(a, 6000, "2026-10-21"), pay(b, 2000, "2026-10-22", { method: "Venmo" })], []);
  assert.deepEqual(rows.map(r => [r.on, r.cents, r.method]).sort(), [["2026-10-21", 6000, "Cash"], ["2026-10-22", 2000, "Venmo"]]);
  assert.equal(LGC.sumCents(rows), 8000);
});

test("removed payments, void invoices and quotes bring in nothing", () => {
  const a = inv(), v = inv({ state: "void" }), q = inv({ kind: "quote" });
  const rows = LGC.moneyIn([a, v, q], [pay(a, 5000, "2026-10-21", { voided_at: "2026-10-22T10:00:00Z" }), pay(v, 5000, "2026-10-21"), pay(q, 5000, "2026-10-21")], []);
  assert.deepEqual(rows, []);
});

test("jobs finished before invoices count from the booking: total plus tip, how they paid", () => {
  const old = booking({ total: 50, tip: 10, paid_with: "Cash App" });
  const rows = LGC.moneyIn([], [], [old, booking({ status: "Confirmed" }), booking({ status: "Cancelled" }), booking({ status: "Requested" })]);
  assert.equal(rows.length, 1, "only Done jobs earned anything");
  assert.deepEqual([rows[0].on, rows[0].cents, rows[0].tip_cents, rows[0].method, rows[0].booking_id], ["2026-10-10", 6000, 1000, "Cash App", old.id]);
  assert.equal(LGC.moneyIn([], [], [booking({ paid_with: null })])[0].method, "Not recorded");
});

test("a job with an invoice is counted once, from its payments, never from the booking too", () => {
  const job = booking({ total: 50 }), i = inv({ booking_id: job.id, total_cents: 5000 });
  assert.equal(LGC.sumCents(LGC.moneyIn([i], [pay(i, 5000, "2026-10-12")], [job])), 5000, "paid: counted once");
  assert.equal(LGC.sumCents(LGC.moneyIn([i], [], [job])), 0, "invoiced but not paid yet: nothing in");
  const voided = inv({ booking_id: job.id, state: "void" });
  assert.equal(LGC.sumCents(LGC.moneyIn([voided], [], [job])), 0, "voiding the job's invoice takes its money out");
  const quote = inv({ kind: "quote", booking_id: job.id });
  assert.equal(LGC.sumCents(LGC.moneyIn([quote], [], [job])), 5000, "a quote alone doesn't stand in for the job's money");
});

test("the tip is the last money in: part payments pay for the work first", () => {
  const i = inv({ total_cents: 6000, tip_cents: 1000 });
  const parts = LGC.moneyIn([i], [pay(i, 3000, "2026-10-21"), pay(i, 3000, "2026-10-25")], []).sort((a, b) => a.on.localeCompare(b.on));
  assert.deepEqual(parts.map(r => r.tip_cents), [0, 1000]);
  const split = LGC.moneyIn([i], [pay(i, 4500, "2026-10-21"), pay(i, 1500, "2026-10-25")], []).sort((a, b) => a.on.localeCompare(b.on));
  assert.deepEqual(split.map(r => r.tip_cents), [0, 1000], "the second payment crosses into the tip");
  const uneven = LGC.moneyIn([i], [pay(i, 5500, "2026-10-21"), pay(i, 500, "2026-10-25")], []).sort((a, b) => a.on.localeCompare(b.on));
  assert.deepEqual(uneven.map(r => r.tip_cents), [500, 500]);
  assert.equal(LGC.moneyIn([i], [pay(i, 6000, "2026-10-21")], [])[0].tip_cents, 1000, "paid in full at once");
  const late = LGC.moneyIn([i], [pay(i, 3000, "2026-10-25"), pay(i, 3000, "2026-10-21")], []).find(r => r.on === "2026-10-25");
  assert.equal(late.tip_cents, 1000, "payments are taken in date order, not the order they were loaded");
});

test("a date range includes both its first and last day", () => {
  const rows = [{ on: "2026-09-30", cents: 1 }, { on: "2026-10-01", cents: 10 }, { on: "2026-10-31", cents: 100 }, { on: "2026-11-01", cents: 1000 }];
  assert.equal(LGC.sumCents(LGC.between(rows, "2026-10-01", "2026-10-31")), 110);
});

test("money by payment method counts Card as its own method, biggest first", () => {
  const rows = [{ cents: 2000, method: "Cash" }, { cents: 5000, method: "Card" }, { cents: 1000, method: "Cash" }, { cents: 500, method: "Venmo" }];
  assert.deepEqual(LGC.tally(rows, "method"), [["Card", 5000, 1], ["Cash", 3000, 2], ["Venmo", 500, 1]]);
});

test("finished jobs: Done bookings plus sent invoices for work that was never booked", () => {
  const job = booking({ total: 50, tip: 5 }), linked = inv({ booking_id: job.id, total_cents: 6500 });
  const walkUp = inv({ job_date: "2026-10-15", total_cents: 3000, items: [{ ref: "pkg:interior", name: "Interior", qty: 1, unit_cents: 3000 }] });
  const draft = inv({ state: "draft" }), voided = inv({ state: "void" }), quote = inv({ kind: "quote" });
  const jobs = LGC.completedJobs([job, booking({ status: "Confirmed" })], [linked, walkUp, draft, voided, quote], ST, NAMES);
  assert.deepEqual(jobs.map(j => [j.on, j.cents, j.package]), [["2026-10-10", 6500, "The Full Detail"], ["2026-10-15", 3000, "Interior"]]);
  assert.equal(LGC.completedJobs([booking({ total: 50, tip: 5 })], [], ST, NAMES)[0].cents, 5500, "no invoice: the booking's total and tip");
});

test("each job is named by its package, or as a bike, house or trash can job", () => {
  assert.equal(LGC.completedJobs([booking({ service: "bike", package: "Bike detail" })], [], ST, NAMES)[0].package, "Bike detail");
  assert.equal(LGC.completedJobs([booking({ service: "trash", package: "Trash can cleaning", size: "2 cans" })], [], ST, NAMES)[0].package, "Trash can cleaning");
  assert.equal(LGC.completedJobs([booking({ service: "house", package: null })], [], ST, NAMES)[0].package, "Full house pressure wash");
  const named = (items) => LGC.invoicePackage({ items }, ST, NAMES);
  assert.equal(named([{ ref: "size:suv", name: "SUV size" }, { ref: "pkg:exterior", name: "Old name" }]), "Exterior", "the current package name wins");
  assert.equal(named([{ ref: "pkg:gone", name: "Winter Special" }]), "Winter Special", "a package since removed keeps the invoice's name");
  assert.equal(named([{ ref: "svc:house", name: "House" }]), "Full house pressure wash");
  assert.equal(named([{ ref: "svc:trash", name: "Trash can cleaning" }]), "Trash can cleaning");
  assert.equal(named([{ ref: "custom", name: "Headlight restore" }]), "Other");
});

test("most popular package goes by number of jobs, then by money", () => {
  const jobs = [{ package: "Exterior", cents: 2500 }, { package: "Exterior", cents: 2500 }, { package: "The Full Detail", cents: 5000 }, { package: "Interior", cents: 3000 }];
  assert.deepEqual(LGC.tally(jobs, "package", "count").map(r => r[0]), ["Exterior", "The Full Detail", "Interior"]);
  assert.deepEqual(LGC.tally([], "package", "count"), []);
});

test("who still owes: sent invoices with money left, late ones first", () => {
  const today = "2026-10-27";
  const late = inv({ number: 1, due_on: "2026-10-20", total_cents: 5000 });
  const veryLate = inv({ number: 2, due_on: "2026-10-01", total_cents: 3000 });
  const partLate = inv({ number: 3, due_on: "2026-10-25", total_cents: 6000 });
  const notDue = inv({ number: 4, due_on: "2026-11-02", total_cents: 4000 });
  const dueToday = inv({ number: 5, due_on: today, total_cents: 1000 });
  const paid = inv({ number: 6, due_on: "2026-10-01" }), draft = inv({ number: 7, state: "draft", due_on: "2026-10-01" });
  const voided = inv({ number: 8, state: "void" }), quote = inv({ number: 9, kind: "quote" });
  const pays = [pay(partLate, 2000, "2026-10-22"), pay(paid, 5000, "2026-10-02"), pay(late, 5000, "2026-10-21", { voided_at: "2026-10-22T09:00:00Z" })];
  const owed = LGC.owedInvoices([late, veryLate, partLate, notDue, dueToday, paid, draft, voided, quote], pays, today);
  assert.deepEqual(owed.map(r => [r.inv.number, r.balance, r.daysLate]), [[2, 3000, 26], [1, 5000, 7], [3, 4000, 2], [5, 1000, 0], [4, 4000, 0]]);
  assert.equal(owed.find(r => r.inv.number === 3).status, "Partially Paid", "a part-paid late invoice still counts as late");
  assert.equal(owed.find(r => r.inv.number === 1).status, "Overdue", "a removed payment doesn't count");
  assert.equal(LGC.sumCents(owed.filter(r => r.daysLate), "balance"), 12000);
});
