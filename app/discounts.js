// Discount rules shared by the website (index.html) and LGC Pro (app/), so both always agree.
// Tested by tests/discounts.test.mjs. Prices on bookings are whole dollars, so discounts are too.
//
// The rule Andrew set: ONE discount per booking, whichever saves the customer the most.
// Discounts stack on top of launch prices (that's just the price), but never on each other.
(function (root) {
  "use strict";

  const SERVICES = ["car", "bike", "house", "trash"];

  // Every promotion has its own on/off switch. Holiday promos ship switched off with example dates.
  const DEFAULT_DISCOUNTS = {
    military: { on: true, percent: 10, services: ["car"] },
    twoCar: { on: true, amount: 5 },
    promos: [
      { id: "black-friday", name: "Black Friday weekend", message: "Black Friday weekend: 12% off any detail", kind: "percent", value: 12, start: "2026-11-27", end: "2026-11-30", on: false, services: ["car"] },
      { id: "december", name: "December holidays", message: "Holiday deal: 12% off any detail through Dec 24", kind: "percent", value: 12, start: "2026-12-01", end: "2026-12-24", on: false, services: ["car"] },
      { id: "valentines", name: "Valentine's Day", message: "Treat your car: 12% off for Valentine's week", kind: "percent", value: 12, start: "2027-02-07", end: "2027-02-14", on: false, services: ["car"] }
    ]
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const wholeIn = (v, lo, hi) => Number.isInteger(Number(v)) && v !== "" && v !== null && Number(v) >= lo && Number(v) <= hi;
  const servicesOf = (v, fallback) => {
    const list = Array.isArray(v) ? v.filter((s) => SERVICES.includes(s)) : null;
    return list ? [...new Set(list)] : fallback.slice();
  };

  // Accept only well-formed values from the settings row; anything odd falls back to the built-in default,
  // so a typo in Settings can never break the quote.
  function mergeDiscounts(base, d) {
    const out = clone(base || DEFAULT_DISCOUNTS);
    if (!d || typeof d !== "object") return out;
    if (d.military && typeof d.military === "object") {
      const m = d.military;
      out.military = {
        on: typeof m.on === "boolean" ? m.on : out.military.on,
        percent: wholeIn(m.percent, 1, 90) ? Number(m.percent) : out.military.percent,
        services: servicesOf(m.services, out.military.services)
      };
    }
    if (d.twoCar && typeof d.twoCar === "object") {
      const t = d.twoCar;
      out.twoCar = { on: typeof t.on === "boolean" ? t.on : out.twoCar.on, amount: wholeIn(t.amount, 1, 500) ? Number(t.amount) : out.twoCar.amount };
    }
    if (Array.isArray(d.promos)) {
      out.promos = d.promos.slice(0, 20).map(promoOf).filter(Boolean);
    }
    return out;
  }

  function promoOf(p) {
    if (!p || typeof p !== "object") return null;
    const kind = p.kind === "amount" ? "amount" : p.kind === "percent" ? "percent" : null;
    if (!kind || !text(p.id, 40) || !text(p.name, 60) || !isDate(p.start) || !isDate(p.end) || p.end < p.start) return null;
    if (!(kind === "percent" ? wholeIn(p.value, 1, 90) : wholeIn(p.value, 1, 500))) return null;
    return {
      id: p.id.trim(), name: p.name.trim(), message: text(p.message, 120) ? p.message.trim() : p.name.trim(),
      kind, value: Number(p.value), start: p.start, end: p.end, on: p.on === true, services: servicesOf(p.services, ["car"])
    };
  }

  // Promos switched on whose dates include `today` ("YYYY-MM-DD"; start and end days count).
  function activePromos(discounts, today) {
    return (discounts && discounts.promos ? discounts.promos : []).filter((p) => p.on && today >= p.start && today <= p.end);
  }

  // Percent of a whole-dollar amount, rounded to the nearest dollar (half up), never more than the amount.
  function percentOff(dollars, percent) { return Math.min(dollars, Math.floor((dollars * percent + 50) / 100)); }

  // The discount this booking gets, or null.
  //   input.service   "car" | "bike" | "house" | "trash"
  //   input.subtotal  whole dollars before any discount (both cars, when there are two)
  //   input.secondCar whole dollars for the second car alone, when booking two (0 or missing otherwise)
  //   input.military  the customer ticked the military / first-responder box
  //   today           "YYYY-MM-DD": promos follow the day of booking, like the launch price does
  // Returns { id, label, amount } where amount is whole dollars off.
  function bestDiscount(input, discounts, today) {
    const d = discounts || DEFAULT_DISCOUNTS;
    const subtotal = Math.max(0, Math.round(Number(input.subtotal) || 0));
    if (!subtotal) return null;
    const service = SERVICES.includes(input.service) ? input.service : "car";
    const offers = [];
    for (const p of activePromos(d, today)) {
      if (!p.services.includes(service)) continue;
      const amount = p.kind === "percent" ? percentOff(subtotal, p.value) : Math.min(subtotal, p.value);
      offers.push({ id: "promo:" + p.id, label: p.kind === "percent" ? p.name + " (" + p.value + "% off)" : p.name + " ($" + p.value + " off)", amount });
    }
    if (input.military && d.military.on && d.military.services.includes(service)) {
      offers.push({ id: "military", label: "Military / first responder (" + d.military.percent + "% off)", amount: percentOff(subtotal, d.military.percent) });
    }
    const second = Math.max(0, Math.round(Number(input.secondCar) || 0));
    if (second && service === "car" && d.twoCar.on) {
      offers.push({ id: "two-car", label: "Two-car deal ($" + d.twoCar.amount + " off the second car)", amount: Math.min(second, d.twoCar.amount) });
    }
    // Biggest saving wins; on a tie the earlier offer (promos, then military, then two-car) is kept.
    let best = null;
    for (const o of offers) if (o.amount > 0 && (!best || o.amount > best.amount)) best = o;
    return best;
  }

  const LGD = { DEFAULT_DISCOUNTS, SERVICES, mergeDiscounts, activePromos, bestDiscount, percentOff };
  if (typeof module === "object" && module.exports) module.exports = LGD; else root.LGD = LGD;
})(this);
