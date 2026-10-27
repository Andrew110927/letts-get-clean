// The shared discount rules (app/discounts.js). Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGD from "../app/discounts.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
// Andrew's answers: military 10%, $5 off a second car, holidays 12% (switched off until he turns them on).
const withPromos = (...ids) => {
  const d = clone(LGD.DEFAULT_DISCOUNTS);
  for (const p of d.promos) p.on = ids.includes(p.id);
  return d;
};

test("no discount when nothing applies", () => {
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50 }, LGD.DEFAULT_DISCOUNTS, "2026-11-28"), null);
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 0, military: true }, LGD.DEFAULT_DISCOUNTS, "2026-11-28"), null);
});

test("holiday promos ship switched off, and count only between their start and end days", () => {
  const off = LGD.DEFAULT_DISCOUNTS;
  assert.ok(off.promos.every((p) => p.on === false));
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50 }, off, "2026-11-28"), null);
  const bf = withPromos("black-friday");
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50 }, bf, "2026-11-26"), null, "day before");
  assert.deepEqual(LGD.bestDiscount({ service: "car", subtotal: 50 }, bf, "2026-11-27"), { id: "promo:black-friday", label: "Black Friday weekend (12% off)", amount: 6 });
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50 }, bf, "2026-11-30").amount, 6, "last day counts");
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50 }, bf, "2026-12-01"), null, "day after");
});

test("only one discount per booking: the one that saves the most", () => {
  const bf = withPromos("black-friday");
  // $70 Full Detail on Black Friday by a veteran: 12% ($8) beats 10% ($7). They don't add up.
  assert.deepEqual(LGD.bestDiscount({ service: "car", subtotal: 70, military: true }, bf, "2026-11-28"), { id: "promo:black-friday", label: "Black Friday weekend (12% off)", amount: 8 });
  // Outside the promo, the military discount applies.
  assert.deepEqual(LGD.bestDiscount({ service: "car", subtotal: 70, military: true }, bf, "2026-12-05"), { id: "military", label: "Military / first responder (10% off)", amount: 7 });
  // Two $25 Exteriors: $5 off the second car beats 10% of $50.
  const two = LGD.bestDiscount({ service: "car", subtotal: 50, secondCar: 25, military: true }, LGD.DEFAULT_DISCOUNTS, "2026-11-10");
  assert.equal(two.id, "military", "10% of $50 is $5, a tie: the earlier offer is kept");
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50, secondCar: 25 }, LGD.DEFAULT_DISCOUNTS, "2026-11-10").id, "two-car");
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 140, secondCar: 70, military: true }, LGD.DEFAULT_DISCOUNTS, "2026-11-20").amount, 14);
});

test("percentages round to the nearest dollar, half up", () => {
  assert.equal(LGD.percentOff(35, 12), 4, "$4.20 → $4");
  assert.equal(LGD.percentOff(45, 10), 5, "$4.50 → $5");
  assert.equal(LGD.percentOff(25, 12), 3, "$3.00");
  assert.equal(LGD.percentOff(2, 90), 2, "never more than the price");
});

test("the two-car deal never takes off more than the second car costs", () => {
  const d = clone(LGD.DEFAULT_DISCOUNTS);
  d.twoCar.amount = 50;
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 60, secondCar: 30 }, d, "2026-11-10").amount, 30);
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 30, secondCar: 0 }, d, "2026-11-10"), null, "one car, no deal");
});

test("switched-off discounts and other services don't count", () => {
  const d = withPromos("black-friday");
  d.military.on = false;
  d.twoCar.on = false;
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 50, military: true, secondCar: 25 }, d, "2026-12-05"), null);
  // Holiday promos and the military discount are for car details unless Andrew adds other services.
  assert.equal(LGD.bestDiscount({ service: "house", subtotal: 300, military: true }, withPromos("black-friday"), "2026-11-28"), null);
  assert.equal(LGD.bestDiscount({ service: "bike", subtotal: 20, secondCar: 20 }, LGD.DEFAULT_DISCOUNTS, "2026-11-10"), null, "two-car is cars only");
  const all = withPromos("black-friday");
  all.promos[0].services = ["car", "bike", "house"];
  assert.equal(LGD.bestDiscount({ service: "house", subtotal: 300 }, all, "2026-11-28").amount, 36);
});

test("a dollar-amount promo works too, capped at the price", () => {
  const d = LGD.mergeDiscounts(LGD.DEFAULT_DISCOUNTS, {
    promos: [{ id: "spring", name: "Spring clean", kind: "amount", value: 10, start: "2027-03-01", end: "2027-03-31", on: true }]
  });
  assert.deepEqual(LGD.bestDiscount({ service: "car", subtotal: 35 }, d, "2027-03-15"), { id: "promo:spring", label: "Spring clean ($10 off)", amount: 10 });
  assert.equal(LGD.bestDiscount({ service: "car", subtotal: 8 }, d, "2027-03-15").amount, 8);
});

test("bad settings values fall back instead of breaking the quote", () => {
  const d = LGD.mergeDiscounts(LGD.DEFAULT_DISCOUNTS, {
    military: { on: "yes", percent: 150, services: ["car", "boat"] },
    twoCar: { amount: -5 },
    promos: [
      { id: "ok", name: "Fine", kind: "percent", value: 15, start: "2026-12-01", end: "2026-12-02", on: true, services: ["bike"] },
      { id: "backwards", name: "Ends before it starts", kind: "percent", value: 10, start: "2026-12-05", end: "2026-12-01", on: true },
      { id: "huge", name: "Too much", kind: "percent", value: 100, start: "2026-12-01", end: "2026-12-02", on: true },
      { id: "nokind", name: "No kind", value: 10, start: "2026-12-01", end: "2026-12-02", on: true },
      null
    ]
  });
  assert.deepEqual(d.military, { on: true, percent: 10, services: ["car"] });
  assert.deepEqual(d.twoCar, LGD.DEFAULT_DISCOUNTS.twoCar);
  assert.deepEqual(d.promos.map((p) => p.id), ["ok"]);
  assert.deepEqual(d.promos[0].services, ["bike"]);
  assert.equal(d.promos[0].message, "Fine", "a promo with no message shows its name");
  assert.deepEqual(LGD.mergeDiscounts(LGD.DEFAULT_DISCOUNTS, null), LGD.DEFAULT_DISCOUNTS);
  assert.deepEqual(LGD.mergeDiscounts(LGD.DEFAULT_DISCOUNTS, {}).promos, LGD.DEFAULT_DISCOUNTS.promos, "no promos key keeps the defaults");
});

test("activePromos lists only switched-on promos running today", () => {
  const d = withPromos("black-friday", "december");
  assert.deepEqual(LGD.activePromos(d, "2026-11-29").map((p) => p.id), ["black-friday"]);
  assert.deepEqual(LGD.activePromos(d, "2026-12-24").map((p) => p.id), ["december"]);
  assert.deepEqual(LGD.activePromos(d, "2027-02-10").map((p) => p.id), [], "Valentine's is off");
});
