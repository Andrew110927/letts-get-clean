// Reports and backup (app/core.js): spreadsheet files, the accountant's year and the backup file. Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGC from "../app/core.js";

const NAMES = { bike: "Bike detail", house: "Full house pressure wash" };
let n = 0;
const inv = (o) => ({ id: "i" + ++n, kind: "invoice", state: "sent", number: n, prefix: "LGC-", customer_id: "c1", vehicle_id: null, booking_id: null,
  issued_on: "2026-10-20", job_date: "2026-10-20", due_on: "2026-10-27", items: [{ ref: "pkg:full", name: "The Full Detail", qty: 1, unit_cents: 5000 }],
  subtotal_cents: 5000, discount_cents: 0, tax_cents: 0, tip_cents: 0, total_cents: 5000, notes: null, void_reason: null, ...o });
const pay = (invoice, cents, on, o) => ({ id: "p" + ++n, invoice_id: invoice.id, amount_cents: cents, paid_on: on, method: "Cash", note: null, voided_at: null, created_at: on + "T18:00:00Z", ...o });
const booking = (o) => ({ id: "b" + ++n, status: "Done", date: "2026-03-10", name: "Old Customer", total: 50, tip: 0, paid_with: "Cash", package: "Exterior", service: "car", customer_id: null, ...o });
const CUSTOMERS = [{ id: "c1", name: "Mike Dawson", phone: "(845) 555-0101", email: "mike@example.com" }, { id: "c2", name: "=HYPERLINK(\"http://x\")", phone: "+1 845 555 0102", email: null }];
const VEHICLES = [{ id: "v1", customer_id: "c1", year: 2019, color: "Black", make: "Honda", model: "CR-V" }];
// Reads our own CSV back: enough of the format to check what Excel would see.
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += ch;
  }
  return rows;
}

test("CSV: commas, quotes and line breaks survive, rows end in Windows line endings", () => {
  const text = LGC.toCsv([["a", "b, c", 'say "hi"', "two\nlines", null, 7, ""]]);
  assert.equal(text, 'a,"b, c","say ""hi""","two\nlines",,7,\r\n');
  assert.deepEqual(parseCsv(text), [["a", "b, c", 'say "hi"', "two\nlines", "", "7", ""]]);
});

test("CSV: anything a customer typed that looks like a formula is shown as text, numbers stay numbers", () => {
  const [row] = parseCsv(LGC.toCsv([["=SUM(A1:A9)", "+1 845 555 0102", "@cmd", "-2+3", "\tx", "-5.00", "12.50", "-7", "Mike - detail"]]));
  assert.deepEqual(row, ["'=SUM(A1:A9)", "'+1 845 555 0102", "'@cmd", "'-2+3", "'\tx", "-5.00", "12.50", "-7", "Mike - detail"]);
});

test("money in splits sales tax across part payments and adds up to the invoice's tax exactly", () => {
  // $50 of work + $4.06 tax (8.125%) + $10 tip = $64.06, paid $20, $20, then the rest.
  const i = inv({ subtotal_cents: 5000, tax_cents: 406, tip_cents: 1000, total_cents: 6406 });
  const rows = LGC.moneyIn([i], [pay(i, 2000, "2026-10-20"), pay(i, 2000, "2026-10-21"), pay(i, 2406, "2026-10-22")], []);
  rows.sort((a, b) => a.on.localeCompare(b.on));
  assert.deepEqual(rows.map(r => r.tip_cents), [0, 0, 1000], "the tip is the last money in");
  assert.equal(LGC.sumCents(rows, "tax_cents"), 406, "tax parts add up to the invoice's tax");
  assert.ok(rows.every(r => r.tax_cents >= 0 && r.tax_cents <= r.cents - r.tip_cents), "each payment's tax fits inside its non-tip part");
  assert.deepEqual(rows.map(r => r.tax_cents), [150, 150, 106]);
});

test("money in: no tax means zero tax, a tip-only invoice doesn't break, old jobs carry no tax", () => {
  const plain = inv(), tipOnly = inv({ items: [{ name: "Tip", qty: 1, unit_cents: 0 }], subtotal_cents: 0, tip_cents: 1500, total_cents: 1500 });
  const rows = LGC.moneyIn([plain, tipOnly], [pay(plain, 5000, "2026-10-20"), pay(tipOnly, 1500, "2026-10-20")], [booking()]);
  assert.ok(rows.every(r => r.tax_cents === 0 && Number.isFinite(r.tax_cents)));
  assert.equal(rows.find(r => r.invoice_id === tipOnly.id).tip_cents, 1500);
});

test("invoices spreadsheet: invoices issued in the range, oldest first, with what's paid and owed today", () => {
  const sep = inv({ issued_on: "2026-09-30" }), a = inv({ issued_on: "2026-10-01", vehicle_id: "v1", items: [{ name: "The Full Detail", qty: 1, unit_cents: 5000 }, { name: "Floor mats", qty: 2, unit_cents: 500 }], subtotal_cents: 6000, total_cents: 6000 });
  const b = inv({ issued_on: "2026-10-31", due_on: "2026-11-07" }), v = inv({ issued_on: "2026-10-05", state: "void", void_reason: "Typo" }), q = inv({ issued_on: "2026-10-05", kind: "quote", prefix: "Q-" });
  const nov = inv({ issued_on: "2026-11-01" });
  const pays = [pay(a, 2000, "2026-10-02"), pay(a, 1000, "2026-10-03", { voided_at: "2026-10-04T00:00:00Z" })];
  const rows = LGC.invoicesCsv([b, nov, v, q, a, sep], pays, CUSTOMERS, VEHICLES, "2026-10-01", "2026-10-31", "2026-11-15");
  assert.equal(rows[0][0], "Invoice");
  assert.equal(rows[0].length, 18);
  assert.deepEqual(rows.slice(1).map(r => r[0]), [LGC.invoiceNumber(a), LGC.invoiceNumber(v), LGC.invoiceNumber(b)], "range is inclusive, quotes and other months left out");
  const head = rows[0], col = (r, name) => r[head.indexOf(name)];
  const [ra, rv, rb] = rows.slice(1);
  assert.equal(col(ra, "Status"), "Partially Paid");
  assert.equal(col(ra, "Customer"), "Mike Dawson");
  assert.equal(col(ra, "Car"), "2019 Black Honda CR-V");
  assert.equal(col(ra, "Services"), "The Full Detail; 2 × Floor mats");
  assert.deepEqual([col(ra, "Total"), col(ra, "Paid"), col(ra, "Still owed")], ["60.00", "20.00", "40.00"], "removed payment doesn't count");
  assert.deepEqual([col(rv, "Status"), col(rv, "Still owed"), col(rv, "Notes")], ["Void", "0.00", "Void: Typo"]);
  assert.equal(col(rb, "Status"), "Overdue");
});

test("money in spreadsheet: same money as the Money screen, oldest first, old jobs explained", () => {
  const a = inv({ customer_id: "c1" }), b = inv({ customer_id: "c2", total_cents: 3000, subtotal_cents: 3000 });
  const old = booking({ date: "2026-10-03", total: 40, tip: 5, paid_with: "Venmo" });
  const ins = LGC.moneyIn([a, b], [pay(a, 5000, "2026-10-09", { note: "paid at the door" }), pay(b, 3000, "2026-10-01", { method: "Cash App" }), pay(a, 0 + 1, "2026-11-02", { voided_at: "x" })], [old]);
  const rows = LGC.moneyInCsv(ins, [a, b], [old], CUSTOMERS, NAMES, "2026-10-01", "2026-10-31");
  assert.deepEqual(rows[0], ["Date paid", "Customer", "Invoice", "For", "Paid with", "Amount", "Tip", "Sales tax", "Note"]);
  assert.deepEqual(rows.slice(1).map(r => r[0]), ["2026-10-01", "2026-10-03", "2026-10-09"]);
  assert.deepEqual(rows[2], ["2026-10-03", "Old Customer", "", "Exterior", "Venmo", "45.00", "5.00", "0.00", "Job marked Done before invoices"]);
  assert.deepEqual(rows[3].slice(1, 6), ["Mike Dawson", LGC.invoiceNumber(a), "The Full Detail", "Cash", "50.00"]);
  assert.equal(rows[3][8], "paid at the door");
  const total = rows.slice(1).reduce((s, r) => s + Math.round(Number(r[5]) * 100), 0);
  assert.equal(total, LGC.sumCents(LGC.between(ins, "2026-10-01", "2026-10-31")), "the column adds up to the Money screen's number");
  const [, formula] = parseCsv(LGC.toCsv(rows));
  assert.equal(formula[1], "'=HYPERLINK(\"http://x\")", "a booking-form name can't run as a formula");
});

test("year summary: month by month, totals are the months added up, profit leaves out tax and expenses", () => {
  const i = inv({ subtotal_cents: 5000, tax_cents: 406, tip_cents: 1000, total_cents: 6406 });
  const ins = LGC.moneyIn([i], [pay(i, 6406, "2026-02-14", { method: "Venmo" })], [booking({ date: "2026-01-05", total: 60, tip: 10 }), booking({ date: "2025-12-31", total: 99 })]);
  const jobs = [{ on: "2026-01-05", cents: 7000 }, { on: "2026-02-13", cents: 6406 }, { on: "2026-02-20", cents: 5000 }];
  const exp = LGC.expenseRows([{ spent_on: "2026-01-20", amount: "25.50", category: "Supplies" }, { spent_on: "2026-02-01", amount: 40, category: "Gas" }, { spent_on: "2026-02-03", amount: 10, category: "Supplies" }]);
  const s = LGC.yearSummary(ins, jobs, exp, 2026, "2026-03-09");
  assert.deepEqual(s.months.map(m => m.label), ["January", "February", "March"], "a year still going stops at this month");
  const [jan, feb, mar] = s.months;
  assert.deepEqual(jan, { label: "January", jobs: 1, in: 7000, services: 6000, tips: 1000, tax: 0, expenses: 2550, profit: 4450 });
  assert.deepEqual(feb, { label: "February", jobs: 2, in: 6406, services: 5000, tips: 1000, tax: 406, expenses: 5000, profit: 1000 });
  assert.equal(mar.in, 0);
  for (const k of ["jobs", "in", "services", "tips", "tax", "expenses", "profit"]) assert.equal(s.total[k], s.months.reduce((t, m) => t + m[k], 0), k + " adds up");
  assert.deepEqual(s.byCategory.map(r => r.slice(0, 2)), [["Gas", 4000], ["Supplies", 3550]]);
  assert.deepEqual(s.byMethod.map(r => r.slice(0, 2)), [["Cash", 7000], ["Venmo", 6406]]);
  assert.equal(LGC.yearSummary(ins, jobs, exp, 2025, "2026-03-09").months.length, 12, "a past year has all twelve months");
  assert.equal(LGC.yearSummary(ins, jobs, exp, 2025, "2026-03-09").total.in, 9900);
});

test("report years: every year with something in it, newest first, always this year, nothing from the future", () => {
  assert.deepEqual(LGC.reportYears("2026-10-27", [{ on: "2024-05-01" }, { on: "2026-01-01" }], [{ on: "2025-07-04" }], [{ on: "2027-01-01" }]), ["2026", "2025", "2024"]);
  assert.deepEqual(LGC.reportYears("2026-10-27"), ["2026"]);
});

test("summary spreadsheet: a title, the month table with its total, then expenses and payment methods", () => {
  const s = LGC.yearSummary([], [], [], 2026, "2026-02-10");
  const rows = LGC.summaryCsv(s, "Letts Get Clean");
  assert.equal(rows[0][0], "Letts Get Clean income summary 2026");
  const head = rows.findIndex(r => r[0] === "Month");
  assert.deepEqual(rows[head], ["Month", "Jobs done", "Money in", "Services", "Tips", "Sales tax", "Expenses", "Profit"]);
  assert.deepEqual(rows.slice(head + 1, head + 4).map(r => r[0]), ["January", "February", "Total"]);
  assert.deepEqual(rows[head + 3], ["Total", 0, "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"]);
  assert.deepEqual(rows[rows.findIndex(r => r[0] === "Expenses by type") + 1], ["None", "0.00"]);
  const back = parseCsv(LGC.toCsv(rows));
  assert.equal(back.length, rows.length, "blank lines stay blank lines");
});

test("negative profit is written as a plain negative number", () => {
  const s = LGC.yearSummary([], [], LGC.expenseRows([{ spent_on: "2026-01-02", amount: 215, category: "Other" }]), 2026, "2026-01-31");
  const total = LGC.summaryCsv(s, "X").find(r => r[0] === "Total");
  assert.equal(total[7], "-215.00");
  assert.equal(parseCsv(LGC.toCsv([total]))[0][7], "-215.00", "not turned into text by the formula guard");
});

// A pretend table behind a server that hands back at most `cap` rows per request.
function server(n, cap, withCount = true) {
  const table = Array.from({ length: n }, (_, i) => ({ id: i })), calls = [];
  const fetchPage = async (from, to, first) => {
    calls.push([from, to]);
    return { data: table.slice(from, Math.min(to, from + cap - 1) + 1), count: first && withCount ? n : null };
  };
  return { fetchPage, calls };
}

test("reading a whole table: every row once, in order, past the server's per-request limit", async () => {
  const s = server(2500, 1000), rows = await LGC.readAll(s.fetchPage);
  assert.equal(rows.length, 2500);
  assert.ok(rows.every((r, i) => r.id === i), "no row skipped or repeated");
  assert.deepEqual(s.calls, [[0, 999], [1000, 1999], [2000, 2999]], "stops once the count is reached");
});

test("reading a whole table: a lower server limit than expected still gets everything", async () => {
  const s = server(250, 100), rows = await LGC.readAll(s.fetchPage);
  assert.equal(rows.length, 250);
  assert.ok(rows.every((r, i) => r.id === i));
  assert.deepEqual(s.calls.map(c => c[0]), [0, 100, 200], "each page starts where the last one ended");
});

test("reading a whole table: empty tables, exact page sizes and a missing count", async () => {
  assert.deepEqual(await LGC.readAll(server(0, 1000).fetchPage), []);
  const exact = server(1000, 1000);
  assert.equal((await LGC.readAll(exact.fetchPage)).length, 1000);
  assert.equal(exact.calls.length, 1, "the count saves asking for an empty second page");
  const blind = server(1500, 1000, false);
  assert.equal((await LGC.readAll(blind.fetchPage)).length, 1500, "without a count it reads until a page comes back empty");
  assert.equal(blind.calls.length, 3);
});

test("reading a whole table: a failed page fails the whole read", async () => {
  let n = 0;
  await assert.rejects(LGC.readAll(async () => { if (n++) throw new Error("offline"); return { data: [{ id: 0 }], count: 5 }; }), /offline/);
});

test("backup: every business table, counted, and nothing tied to a phone or a sign-in", () => {
  const b = LGC.makeBackup({ customers: [{ id: "c1" }, { id: "c2" }], invoices: [{ id: "i1" }], push_subscriptions: [{ endpoint: "x" }], owner_emails: [{ email: "x" }] }, "2026-10-27T12:00:00.000Z", { app: "LGC Pro", demo: true });
  assert.deepEqual(Object.keys(b.tables), LGC.BACKUP_TABLES);
  assert.equal(b.counts.customers, 2);
  assert.equal(b.counts.payments, 0, "a table with nothing in it is still listed");
  assert.equal(b.tables.push_subscriptions, undefined);
  assert.equal(b.tables.owner_emails, undefined);
  assert.equal(b.kind, "letts-get-clean-backup");
  assert.equal(b.made_at, "2026-10-27T12:00:00.000Z");
  assert.equal(b.demo, true);
  for (const t of ["customers", "vehicles", "bookings", "invoices", "payments", "expenses", "invoice_settings", "site_settings"]) assert.ok(LGC.BACKUP_TABLES.includes(t), t + " is backed up");
});
