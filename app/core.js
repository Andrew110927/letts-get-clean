// Plain logic the owner app shares with its tests (node --test "tests/*.test.mjs"): no screens, no database.
// Money is always whole cents (5000 = $50.00), so adding up an invoice never picks up rounding errors.
(function (root) {
  "use strict";

  // ===== Customers =====
  // Same rule as the database's phone_key(): the last 10 digits, so "(845) 555-0101" and "+1 845.555.0101" match.
  function phoneKey(v) { const d = String(v || "").replace(/\D/g, "").slice(-10); return d || null; }

  // "2019 Black Honda CR-V". The database matches booking car text against this same order.
  function vehicleLabel(v) { return v ? [v.year, v.color, v.make, v.model].filter(x => x != null && String(x).trim()).join(" ") : ""; }

  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim()); }

  // Quick search: every word must appear in the name, email, town, address, notes or a car.
  // A phone-looking search (3+ digits, maybe with dashes or brackets) also matches the phone number.
  function customerMatches(c, vehicles, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3 && /^[\d\s().+-]+$/.test(q) && (phoneKey(c.phone) || "").includes(digits)) return true;
    const hay = [c.name, c.email, c.town, c.address, c.notes, ...(vehicles || []).map(vehicleLabel)].map(x => String(x || "").toLowerCase()).join(" \n ");
    return q.split(/\s+/).every(w => hay.includes(w));
  }

  // ===== Money =====
  // "$1,234.50". Cents in, always two decimals out.
  function fmtCents(c) {
    const n = Math.round(Number(c) || 0), sign = n < 0 ? "-" : "", abs = Math.abs(n);
    return sign + "$" + Math.floor(abs / 100).toLocaleString("en-US") + "." + String(abs % 100).padStart(2, "0");
  }
  // What someone typed ("50", "49.5", "$1,200") in cents; NaN when it isn't a money amount.
  function toCents(v) {
    const s = String(v == null ? "" : v).replace(/[$,\s]/g, "");
    if (!/^\d*(\.\d{0,2})?$/.test(s) || s === "" || s === ".") return NaN;
    return Math.round(Number(s) * 100);
  }
  // Whole-number division rounded half up, so percentages of cents land on a cent the same way every time.
  const roundDiv = (n, d) => Math.floor((n + d / 2) / d);

  // ===== Pricing =====
  // The launch price applies to jobs dated on or before the deal's last day; regular prices from the day after.
  // Dates are "YYYY-MM-DD", which compare correctly as text.
  function dealFor(jobDate, dealEnds) { return !!dealEnds && !!jobDate && jobDate <= dealEnds; }
  function priceFor(pkg, jobDate, dealEnds) { return dealFor(jobDate, dealEnds) ? pkg.deal : pkg.regular; }

  // Invoice lines for a booking, at the price the customer was shown when they booked (the website locks in the
  // launch price on the day of booking). If the booking's total was changed since, the main line absorbs the
  // difference so the invoice matches what was agreed. A booking's total is after any website discount
  // (discount_amount); the lines are before it, and the invoice carries the discount separately.
  function linesFromBooking(b, st, names) {
    const dollars = (n) => Math.round(Number(n) * 100);
    const agreed = dollars((Number(b.total) || 0) + (Number(b.discount_amount) || 0));
    if (b.service === "bike" || b.service === "house") {
      const unit = agreed || dollars(b.service === "bike" ? st.bike.price : st.house.price);
      return [{ ref: "svc:" + b.service, name: (b.service === "bike" ? names.bike : names.house) + (b.size && b.service === "bike" ? " · " + b.size : ""), qty: 1, unit_cents: unit }];
    }
    const pkg = st.packages.find(p => p.name === b.package);
    const size = st.sizes.find(s => s.label === b.size);
    const picked = String(b.addons || "").split(",").map(s => s.trim()).filter(Boolean);
    const lines = [{ ref: pkg ? "pkg:" + pkg.id : "custom", name: b.package || "Detail", qty: 1, unit_cents: pkg ? dollars(b.deal ? pkg.deal : pkg.regular) : agreed }];
    if (size && size.price) lines.push({ ref: "size:" + size.id, name: size.label + " size", qty: 1, unit_cents: dollars(size.price) });
    for (const label of picked) {
      const a = st.addons.find(x => x.label === label);
      lines.push({ ref: a ? "addon:" + a.id : "custom", name: label, qty: 1, unit_cents: a ? dollars(a.price) : 0 });
    }
    const sum = lines.reduce((n, l) => n + l.unit_cents * l.qty, 0);
    if (agreed && sum !== agreed) {
      if (lines[0].unit_cents + agreed - sum > 0) lines[0].unit_cents += agreed - sum;
      else return [{ ref: "custom", name: b.package || "Detail", qty: 1, unit_cents: agreed }];
    }
    return lines.filter((l, i) => i === 0 || l.unit_cents > 0);
  }

  // ===== Invoices =====
  // discount: { percent } or { cents }; tax and discount percents allow decimals (8.125).
  function invoiceTotals(inv) {
    const items = Array.isArray(inv.items) ? inv.items : [];
    const subtotal = items.reduce((n, l) => n + (Math.round(Number(l.unit_cents)) || 0) * (Math.round(Number(l.qty)) || 0), 0);
    let discount = 0;
    if (inv.discount_percent != null && inv.discount_percent !== "") discount = roundDiv(subtotal * Math.round(Number(inv.discount_percent) * 100), 10000);
    else discount = Math.round(Number(inv.discount_cents) || 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = roundDiv(taxable * Math.round((Number(inv.tax_percent) || 0) * 1000), 100000);
    const tip = Math.round(Number(inv.tip_cents) || 0);
    return { subtotal, discount, tax, tip, total: subtotal - discount + tax + tip };
  }
  // Everything wrong with an invoice, as sentences for the owner. Empty means it can be saved.
  function invoiceProblems(inv) {
    const out = [], items = Array.isArray(inv.items) ? inv.items : [];
    if (!inv.customer_id) out.push("Pick a customer.");
    if (!items.length) out.push("Add at least one service.");
    if (items.length > 40) out.push("Keep it to 40 lines or fewer.");
    items.forEach((l, i) => {
      const n = "Line " + (i + 1);
      if (!String(l.name || "").trim()) out.push(n + " needs a description.");
      if (!(Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 99)) out.push(n + " needs a quantity from 1 to 99.");
      if (!(Number.isInteger(l.unit_cents) && l.unit_cents >= 0 && l.unit_cents <= 1000000)) out.push(n + " needs a price from $0 to $10,000.");
    });
    const pct = inv.discount_percent;
    if (pct != null && pct !== "" && !(Number(pct) >= 0 && Number(pct) <= 100)) out.push("A discount percent has to be between 0 and 100.");
    if (!(Number.isInteger(inv.tip_cents || 0) && (inv.tip_cents || 0) >= 0)) out.push("The tip can't be negative.");
    if ((pct == null || pct === "") && !(Number.isInteger(inv.discount_cents || 0) && (inv.discount_cents || 0) >= 0)) out.push("The discount can't be negative.");
    if (!out.length) {
      const t = invoiceTotals(inv);
      if (t.discount > t.subtotal) out.push("The discount is bigger than the services. Lower it.");
      else if (t.total <= 0) out.push("The total is $0. An invoice needs something to charge for.");
      else if (t.total > 10000000) out.push("That total is over $100,000. Check the prices.");
    }
    return out;
  }
  function invoiceNumber(inv) { return inv && inv.number ? (inv.prefix || "") + String(inv.number).padStart(4, "0") : "New"; }
  // Status shown to the owner. Only draft / sent / void are stored; the rest come from payments and the due date.
  // An invoice is Overdue once it's been sent and the day after its due date arrives unpaid.
  function invoiceStatus(inv, paidCents, today, converted) {
    if (inv.state === "void") return "Void";
    if (inv.kind === "quote") return converted ? "Converted" : inv.state === "sent" ? "Sent" : "Draft";
    const paid = paidCents || 0;
    if (paid >= inv.total_cents) return "Paid";
    if (paid > 0) return "Partially Paid";
    if (inv.state === "sent" && inv.due_on && today > inv.due_on) return "Overdue";
    return inv.state === "sent" ? "Sent" : "Draft";
  }

  // ===== Payments =====
  // Removed payments (voided_at set) stay on record but don't count.
  function paidCents(payments) { return (payments || []).filter(p => !p.voided_at).reduce((n, p) => n + p.amount_cents, 0); }
  function balanceDue(inv, payments) { return inv.state === "void" || inv.kind === "quote" ? 0 : Math.max(0, inv.total_cents - paidCents(payments)); }
  // Why a payment can't be recorded, as a sentence; null when it can. The database checks the same things.
  function paymentProblem(inv, payments, amountCents) {
    if (inv.kind === "quote") return "A quote can't take payments. Turn it into an invoice first.";
    if (inv.state === "void") return "This invoice is void, so it can't take payments.";
    if (!(Number.isInteger(amountCents) && amountCents > 0)) return "Enter an amount more than $0.";
    const due = balanceDue(inv, payments);
    if (!due) return "This invoice is already paid in full.";
    if (amountCents > due) return "That's " + fmtCents(amountCents - due) + " more than the " + fmtCents(due) + " still owed.";
    return null;
  }

  // Tap-to-pay links with the amount filled in, used on the PDF, its QR codes and text messages.
  // Cash App: cash.app/$tag/amount. Venmo: a pay screen addressed to the handle, with amount and note.
  function cashAppLink(tag, cents) {
    const t = String(tag || "").trim().replace(/^\$/, "");
    if (!t) return "";
    return "https://cash.app/$" + encodeURIComponent(t) + (cents > 0 ? "/" + (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100)) : "");
  }
  function venmoLink(handle, cents, note) {
    const u = String(handle || "").trim().replace(/^@/, "");
    if (!u) return "";
    const q = new URLSearchParams({ txn: "pay", recipients: u });
    if (cents > 0) q.set("amount", (cents / 100).toFixed(2));
    if (note) q.set("note", note);
    return "https://venmo.com/?" + q.toString();
  }

  // ===== Dates =====
  function addDays(ymd, n) { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  // ===== Invoice settings (owner-only invoice_settings row), checked the same way every time they're loaded =====
  function mergeInvoiceSettings(base, d) {
    const out = JSON.parse(JSON.stringify(base));
    if (!d || typeof d !== "object") return out;
    const text = (v, max) => typeof v === "string" && v.length <= max;
    for (const [k, max] of [["businessName", 60], ["ownerName", 60], ["phone", 30], ["email", 120], ["website", 120], ["cashApp", 40], ["venmo", 40], ["note", 300], ["terms", 300]]) {
      if (text(d[k], max)) out[k] = d[k].trim();
    }
    if (out.email && !isEmail(out.email)) out.email = base.email || "";
    if (out.cashApp && !/^\$[A-Za-z][A-Za-z0-9_-]{0,30}$/.test(out.cashApp)) out.cashApp = base.cashApp || "";
    if (out.venmo && !/^@[A-Za-z0-9_-]{1,30}$/.test(out.venmo)) out.venmo = base.venmo || "";
    for (const k of ["invoicePrefix", "quotePrefix"]) if (typeof d[k] === "string" && /^[A-Za-z0-9-]{0,10}$/.test(d[k])) out[k] = d[k];
    if (Number.isFinite(Number(d.taxPercent)) && Number(d.taxPercent) >= 0 && Number(d.taxPercent) <= 25 && d.taxPercent !== "") out.taxPercent = Math.round(Number(d.taxPercent) * 1000) / 1000;
    if (Number.isInteger(Number(d.overdueDays)) && Number(d.overdueDays) >= 0 && Number(d.overdueDays) <= 90 && d.overdueDays !== "") out.overdueDays = Number(d.overdueDays);
    if (typeof d.accent === "string" && /^#[0-9a-f]{6}$/i.test(d.accent)) out.accent = d.accent.toUpperCase();
    // The logo is a small picture saved right in the settings ("" means use the app icon).
    if (d.logo === "" || (typeof d.logo === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(d.logo) && d.logo.length <= 350000)) out.logo = d.logo;
    return out;
  }

  const LGC = {
    phoneKey, vehicleLabel, isEmail, customerMatches,
    fmtCents, toCents, dealFor, priceFor, linesFromBooking,
    invoiceTotals, invoiceProblems, invoiceNumber, invoiceStatus, paidCents, balanceDue, paymentProblem, cashAppLink, venmoLink, addDays, mergeInvoiceSettings
  };
  if (typeof module === "object" && module.exports) module.exports = LGC; else root.LGC = LGC;
})(this);
