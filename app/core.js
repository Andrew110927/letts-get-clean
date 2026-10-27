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
  const daysBetween = (from, to) => Math.round((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 864e5);

  // ===== Money dashboard =====
  // Bookings keep whole dollars; everything here is cents.
  const bookingCents = (n) => Math.round((Number(n) || 0) * 100);

  // Money that came in, one row per payment, dated the day it was paid. Once a job has an invoice, its payments are
  // the truth. Jobs marked Done without one (everything from before invoices) count the old way: the booking's
  // total and tip on the job's day. A voided invoice still claims its job, so voiding takes that money out.
  // Inside one invoice the tip is the last money in: a part payment pays for the work first, and its sales tax
  // share follows the work paid so far, so the parts add up to the invoice's tax exactly once it's paid in full.
  function moneyIn(invoices, payments, bookings) {
    const out = [], live = new Map(), claimed = new Set(), byInvoice = new Map();
    for (const inv of invoices || []) {
      if (inv.kind !== "invoice") continue;
      if (inv.booking_id) claimed.add(inv.booking_id);
      if (inv.state !== "void") live.set(inv.id, inv);
    }
    for (const p of payments || []) {
      if (p.voided_at || !live.has(p.invoice_id)) continue;
      const l = byInvoice.get(p.invoice_id); l ? l.push(p) : byInvoice.set(p.invoice_id, [p]);
    }
    for (const [id, list] of byInvoice) {
      const inv = live.get(id), work = inv.total_cents - (inv.tip_cents || 0), taxAll = inv.tax_cents || 0;
      list.sort((a, b) => a.paid_on.localeCompare(b.paid_on) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
      let before = 0, taxBefore = 0;
      for (const p of list) {
        const tip = Math.max(0, Math.min(p.amount_cents, before + p.amount_cents - work));
        before += p.amount_cents;
        const taxSoFar = work > 0 ? roundDiv(Math.min(before, work) * taxAll, work) : 0;
        out.push({ on: p.paid_on, cents: p.amount_cents, tip_cents: tip, tax_cents: taxSoFar - taxBefore, method: p.method || "Other", note: p.note || null,
          customer_id: inv.customer_id || null, invoice_id: id, booking_id: inv.booking_id || null });
        taxBefore = taxSoFar;
      }
    }
    for (const b of bookings || []) {
      if (b.status !== "Done" || claimed.has(b.id)) continue;
      const tip = bookingCents(b.tip), cents = bookingCents(b.total) + tip;
      if (cents > 0) out.push({ on: b.date, cents, tip_cents: tip, tax_cents: 0, method: b.paid_with || "Not recorded", note: null, customer_id: b.customer_id || null, invoice_id: null, booking_id: b.id });
    }
    return out;
  }

  // What kind of job it was, for "most popular": the package name, or the bike or house service.
  function bookingPackage(b, names) { return b.service === "bike" ? names.bike : b.service === "house" ? names.house : b.package || "Other"; }
  function invoicePackage(inv, st, names) {
    for (const l of inv.items || []) {
      const ref = String(l.ref || "");
      if (ref === "svc:bike") return names.bike;
      if (ref === "svc:house") return names.house;
      if (ref.startsWith("pkg:")) { const p = ((st && st.packages) || []).find(x => "pkg:" + x.id === ref); return p ? p.name : l.name; }
    }
    return "Other";
  }

  // Finished jobs: bookings marked Done (on the job's day), plus sent invoices for work that was never booked
  // (on the job date). cents is what the job came to: its invoice total, or the booking's total and tip.
  function completedJobs(bookings, invoices, st, names) {
    const out = [], byBooking = new Map();
    for (const inv of invoices || []) if (inv.kind === "invoice" && inv.state !== "void" && inv.booking_id) byBooking.set(inv.booking_id, inv);
    for (const b of bookings || []) {
      if (b.status !== "Done") continue;
      const inv = byBooking.get(b.id);
      out.push({ on: b.date, cents: inv ? inv.total_cents : bookingCents(b.total) + bookingCents(b.tip), package: bookingPackage(b, names), customer_id: b.customer_id || null });
    }
    for (const inv of invoices || []) {
      if (inv.kind === "invoice" && inv.state === "sent" && !inv.booking_id) {
        out.push({ on: inv.job_date || inv.issued_on, cents: inv.total_cents, package: invoicePackage(inv, st, names), customer_id: inv.customer_id || null });
      }
    }
    return out;
  }

  // Rows dated from..to, both days included ("YYYY-MM-DD").
  function between(rows, from, to) { return rows.filter(r => r.on >= from && r.on <= to); }
  const sumCents = (rows, key) => rows.reduce((n, r) => n + (r[key || "cents"] || 0), 0);
  // [name, cents, count] per group, biggest first: by "cents" (money by payment method) or by "count" (jobs by package).
  function tally(rows, key, by) {
    const m = new Map();
    for (const r of rows) { const k = r[key] || "Not recorded", x = m.get(k) || [k, 0, 0]; x[1] += r.cents; x[2]++; m.set(k, x); }
    const i = by === "count" ? 2 : 1;
    return [...m.values()].sort((a, b) => b[i] - a[i] || b[3 - i] - a[3 - i] || a[0].localeCompare(b[0]));
  }

  // Sent invoices that still owe money: late ones first (most days late first), then the rest by due date.
  // Late means past the due date with money still owed, part paid or not.
  function owedInvoices(invoices, payments, today) {
    const paid = new Map();
    for (const p of payments || []) if (!p.voided_at) paid.set(p.invoice_id, (paid.get(p.invoice_id) || 0) + p.amount_cents);
    const out = [];
    for (const inv of invoices || []) {
      if (inv.kind !== "invoice" || inv.state !== "sent") continue;
      const got = paid.get(inv.id) || 0, balance = inv.total_cents - got;
      if (balance <= 0) continue;
      out.push({ inv, balance, status: invoiceStatus(inv, got, today, false), daysLate: inv.due_on && today > inv.due_on ? daysBetween(inv.due_on, today) : 0 });
    }
    return out.sort((a, b) => b.daysLate - a.daysLate || String(a.inv.due_on || "9999").localeCompare(String(b.inv.due_on || "9999")) || a.inv.number - b.inv.number);
  }

  // ===== Reports: spreadsheets (CSV) and the accountant's year =====
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // "80.00": dollars as a plain number, so Excel can add the column up.
  const dollars = (c) => ((Math.round(Number(c) || 0)) / 100).toFixed(2);
  const byId = (rows) => new Map((rows || []).map(r => [r.id, r]));
  const servicesText = (items) => (items || []).map(l => (l.qty > 1 ? l.qty + " × " : "") + l.name).join("; ");

  // Spreadsheet text: commas between cells, quotes around any cell that needs them, Windows line endings.
  // Names come from the public booking form, so a cell that starts like a formula (=, +, -, @) gets a leading
  // apostrophe and Excel shows it as text instead of running it. Plain numbers like -5.00 stay numbers.
  function toCsv(rows) {
    const cell = (v) => {
      if (v == null) return "";
      let s = String(v);
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return rows.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
  }

  // One row per invoice issued from..to, oldest first; quotes are left out. Paid and still owed are as of today.
  function invoicesCsv(invoices, payments, customers, vehicles, from, to, today) {
    const paid = new Map(), people = byId(customers), cars = byId(vehicles);
    for (const p of payments || []) if (!p.voided_at) paid.set(p.invoice_id, (paid.get(p.invoice_id) || 0) + p.amount_cents);
    const list = (invoices || []).filter(i => i.kind === "invoice" && i.issued_on >= from && i.issued_on <= to)
      .sort((a, b) => a.issued_on.localeCompare(b.issued_on) || a.number - b.number);
    const rows = [["Invoice", "Status", "Issued", "Job date", "Due", "Customer", "Phone", "Email", "Car", "Services", "Subtotal", "Discount", "Sales tax", "Tip", "Total", "Paid", "Still owed", "Notes"]];
    for (const inv of list) {
      const got = paid.get(inv.id) || 0, c = people.get(inv.customer_id) || {}, owed = inv.state === "void" ? 0 : Math.max(0, inv.total_cents - got);
      rows.push([invoiceNumber(inv), invoiceStatus(inv, got, today, false), inv.issued_on, inv.job_date, inv.due_on, c.name, c.phone, c.email, vehicleLabel(cars.get(inv.vehicle_id)),
        servicesText(inv.items), dollars(inv.subtotal_cents), dollars(inv.discount_cents), dollars(inv.tax_cents), dollars(inv.tip_cents), dollars(inv.total_cents),
        dollars(got), dollars(owed), inv.state === "void" ? "Void" + (inv.void_reason ? ": " + inv.void_reason : "") : inv.notes]);
    }
    return rows;
  }

  // Every bit of money in (moneyIn rows) paid from..to, oldest first: the same money the Money screen counts.
  function moneyInCsv(ins, invoices, bookings, customers, names, from, to) {
    const invs = byId(invoices), jobs = byId(bookings), people = byId(customers);
    const rows = [["Date paid", "Customer", "Invoice", "For", "Paid with", "Amount", "Tip", "Sales tax", "Note"]];
    for (const r of between(ins, from, to).sort((a, b) => a.on.localeCompare(b.on))) {
      const inv = invs.get(r.invoice_id), b = jobs.get(r.booking_id), c = people.get(r.customer_id);
      rows.push([r.on, c ? c.name : b ? b.name : "", inv ? invoiceNumber(inv) : "", inv ? servicesText(inv.items) : b ? bookingPackage(b, names) : "",
        r.method, dollars(r.cents), dollars(r.tip_cents), dollars(r.tax_cents), inv ? r.note : "Job marked Done before invoices"]);
    }
    return rows;
  }

  // Expenses are stored in dollars; reports work in cents.
  function expenseRows(expenses) {
    return (expenses || []).map(e => ({ on: e.spent_on, cents: Math.round((Number(e.amount) || 0) * 100), category: e.category || "Other" }));
  }
  // Years that have anything in them, newest first, always including this one.
  function reportYears(today, ...lists) {
    const ys = new Set([today.slice(0, 4)]);
    for (const l of lists) for (const r of l || []) if (r.on && r.on <= today) ys.add(r.on.slice(0, 4));
    return [...ys].sort().reverse();
  }
  function summaryRow(label, ins, jobs, expenses) {
    const got = sumCents(ins), tips = sumCents(ins, "tip_cents"), tax = sumCents(ins, "tax_cents");
    return { label, jobs, in: got, services: got - tips - tax, tips, tax, expenses, profit: got - tax - expenses };
  }
  // The accountant's year, month by month. Cash basis: money counts on the day it was paid, expenses on the day
  // they were spent. Money in = services + tips + sales tax; profit leaves out the sales tax, which belongs to the
  // state. A year that's still going stops at this month, and the total is always the months added up.
  function yearSummary(ins, jobs, expenses, year, today) {
    const y = String(year), last = y === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12, months = [];
    const end = (m) => y + "-" + String(m).padStart(2, "0") + "-31";
    for (let m = 1; m <= last; m++) {
      const from = y + "-" + String(m).padStart(2, "0") + "-01", to = end(m), e = between(expenses, from, to);
      months.push(summaryRow(MONTHS[m - 1], between(ins, from, to), between(jobs, from, to).length, sumCents(e)));
    }
    const yi = between(ins, y + "-01-01", end(last)), ye = between(expenses, y + "-01-01", end(last));
    return { year: y, months, total: summaryRow("Total", yi, between(jobs, y + "-01-01", end(last)).length, sumCents(ye)), byMethod: tally(yi, "method"), byCategory: tally(ye, "category") };
  }
  function summaryCsv(s, business) {
    const line = (r) => [r.label, r.jobs, dollars(r.in), dollars(r.services), dollars(r.tips), dollars(r.tax), dollars(r.expenses), dollars(r.profit)];
    const list = (rows) => rows.length ? rows.map(([k, c]) => [k, dollars(c)]) : [["None", "0.00"]];
    return [
      [business + " income summary " + s.year],
      ["Money counts on the day it was paid. Money in is services plus tips plus sales tax. Profit is money in minus sales tax and expenses."],
      [],
      ["Month", "Jobs done", "Money in", "Services", "Tips", "Sales tax", "Expenses", "Profit"], ...s.months.map(line), line(s.total),
      [],
      ["Expenses by type", "Amount"], ...list(s.byCategory),
      [],
      ["Money in by how they paid", "Amount"], ...list(s.byMethod)
    ];
  }

  // ===== Reading whole tables =====
  // The server hands back a limited number of rows per request (Supabase's API limit, 1,000 unless changed).
  // fetchPage(from, to, first) asks for rows from..to and, on the first call, how many there are in all.
  // Each next page starts where the rows so far end, so a lower limit than expected never skips any.
  async function readAll(fetchPage, size) {
    const rows = [], step = size || 1000;
    let total = Infinity;
    for (;;) {
      const { data, count } = await fetchPage(rows.length, rows.length + step - 1, rows.length === 0);
      if (rows.length === 0 && count != null) total = count;
      if (!data || !data.length) return rows;
      rows.push(...data);
      if (rows.length >= total) return rows;
    }
  }

  // ===== Backup =====
  // Every table the owner keeps, in one file. Alert subscriptions and the owner list are left out on purpose:
  // they belong to a phone and to sign-in, not to the business.
  const BACKUP_TABLES = ["customers", "vehicles", "bookings", "invoices", "payments", "expenses", "reviews", "social_posts", "social_stats", "site_settings", "invoice_settings"];
  function makeBackup(tables, madeAt, meta) {
    const out = { kind: "letts-get-clean-backup", format: 1, made_at: madeAt, ...meta, counts: {}, tables: {} };
    for (const t of BACKUP_TABLES) { const rows = (tables && tables[t]) || []; out.tables[t] = rows; out.counts[t] = rows.length; }
    return out;
  }

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
    invoiceTotals, invoiceProblems, invoiceNumber, invoiceStatus, paidCents, balanceDue, paymentProblem, cashAppLink, venmoLink, addDays, mergeInvoiceSettings,
    moneyIn, completedJobs, invoicePackage, between, sumCents, tally, owedInvoices,
    toCsv, invoicesCsv, moneyInCsv, expenseRows, reportYears, yearSummary, summaryCsv, readAll, BACKUP_TABLES, makeBackup
  };
  if (typeof module === "object" && module.exports) module.exports = LGC; else root.LGC = LGC;
})(this);
