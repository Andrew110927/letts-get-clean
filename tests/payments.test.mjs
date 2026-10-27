// Partial payments and balances (app/core.js). The database enforces the same rules (tests/db.test.mjs).
// Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGC from "../app/core.js";

const INV = { kind: "invoice", state: "sent", total_cents: 5000, due_on: "2026-11-02" };
const pay = (cents, extra) => ({ amount_cents: cents, method: "Cash", voided_at: null, ...extra });

test("partial payments add up: $20 then $30 pays a $50 invoice", () => {
  const p1 = [pay(2000)];
  assert.equal(LGC.paidCents(p1), 2000);
  assert.equal(LGC.balanceDue(INV, p1), 3000);
  assert.equal(LGC.invoiceStatus(INV, LGC.paidCents(p1), "2026-10-26"), "Partially Paid");
  const p2 = [...p1, pay(3000, { method: "Venmo" })];
  assert.equal(LGC.balanceDue(INV, p2), 0);
  assert.equal(LGC.invoiceStatus(INV, LGC.paidCents(p2), "2026-10-26"), "Paid");
});

test("a partly paid invoice past its due date still shows Partially Paid; a paid one is never Overdue", () => {
  assert.equal(LGC.invoiceStatus(INV, 2000, "2026-12-01"), "Partially Paid");
  assert.equal(LGC.invoiceStatus(INV, 5000, "2026-12-01"), "Paid");
  assert.equal(LGC.invoiceStatus(INV, 0, "2026-12-01"), "Overdue");
});

test("a removed payment stops counting and the balance comes back", () => {
  const list = [pay(2000), pay(3000, { voided_at: "2026-10-26T20:00:00Z" })];
  assert.equal(LGC.paidCents(list), 2000);
  assert.equal(LGC.balanceDue(INV, list), 3000);
});

test("payments can't go past the total, and the message says by how much", () => {
  assert.equal(LGC.paymentProblem(INV, [pay(2000)], 3000), null);
  assert.equal(LGC.paymentProblem(INV, [pay(2000)], 4000), "That's $10.00 more than the $30.00 still owed.");
  assert.equal(LGC.paymentProblem(INV, [pay(5000)], 100), "This invoice is already paid in full.");
});

test("payments must be more than $0, in whole cents", () => {
  for (const bad of [0, -500, 12.5, NaN]) assert.match(LGC.paymentProblem(INV, [], bad), /more than \$0/, String(bad));
});

test("quotes and void invoices take no payments and owe nothing", () => {
  assert.match(LGC.paymentProblem({ ...INV, kind: "quote" }, [], 100), /quote can't take payments/);
  assert.match(LGC.paymentProblem({ ...INV, state: "void" }, [], 100), /void/);
  assert.equal(LGC.balanceDue({ ...INV, kind: "quote" }, []), 0);
  assert.equal(LGC.balanceDue({ ...INV, state: "void" }, []), 0);
});

test("a tip added later raises the total, so the extra cash fits", () => {
  // $50 invoice, customer hands over $60: count $10 as a tip, then the $60 payment is exactly the balance.
  const inv = { ...INV, items: [{ name: "The Full Detail", qty: 1, unit_cents: 5000 }], tip_cents: 1000 };
  const t = LGC.invoiceTotals(inv);
  const withTip = { ...inv, total_cents: t.total };
  assert.equal(withTip.total_cents, 6000);
  assert.equal(LGC.paymentProblem(withTip, [], 6000), null);
});
