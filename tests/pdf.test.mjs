// The invoice PDF (app/pdf.js), built with the real jsPDF and QR libraries and read back as PDF text.
// Setup once: npm install --no-save --no-package-lock jspdf@3.0.3 qrcode-generator@1.4.4 (README "Tests").
import { test } from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import qrcode from "qrcode-generator";
import LGC from "../app/core.js";
import LGCPdf from "../app/pdf.js";

const libs = { jsPDF, qrcode, LGC };
const base = (o) => ({
  kind: "invoice", number: "LGC-0009", status: "Sent", issued: "Oct 26, 2026", jobDate: "Mon, Oct 26, 2026", due: "Nov 2, 2026", where: "At your place",
  business: { name: "Letts Get Clean", tagline: "Mobile car detailing · Orange County, NY", phone: "(845) 282-9387", email: "andrew@example.com", website: "andrew110927.github.io/letts-get-clean" },
  customer: { name: "Maria Gonzalez", phone: "(845) 555-0101", email: "maria@example.com", address: "14 Maple Ave, Newburgh" }, vehicle: "2019 Silver Honda CR-V",
  items: [{ name: "Interior", qty: 1, unit_cents: 3000 }, { name: "SUV / truck size", qty: 1, unit_cents: 1000 }, { name: "Air freshener", qty: 1, unit_cents: 200 }],
  totals: { subtotal: 4200, discount: 0, tax: 0, tip: 0, total: 4200 }, paid: 0, balance: 4200,
  pay: [{ label: "Cash App", handle: "$AndrewLetta", link: LGC.cashAppLink("$AndrewLetta", 4200) }, { label: "Venmo", handle: "@Andrew-Letts-9", link: LGC.venmoLink("@Andrew-Letts-9", 4200, "LGC-0009") }],
  notes: "Thanks for having me out!\nSee you next month.", thanks: "Thanks for choosing Letts Get Clean!", terms: "Payment is due when the job is done.",
  accent: "#29C8FF", logo: null, compress: false, ...o
});
const pdf = (o) => { const doc = LGCPdf.build(base(o), libs); return { doc, out: doc.output() }; };

test("payment links fill in the amount", () => {
  assert.equal(LGC.cashAppLink("$AndrewLetta", 4200), "https://cash.app/$AndrewLetta/42");
  assert.equal(LGC.cashAppLink("AndrewLetta", 4250), "https://cash.app/$AndrewLetta/42.50");
  assert.equal(LGC.cashAppLink("$AndrewLetta", 0), "https://cash.app/$AndrewLetta");
  assert.equal(LGC.venmoLink("@Andrew-Letts-9", 4200, "LGC-0009"), "https://venmo.com/?txn=pay&recipients=Andrew-Letts-9&amount=42.00&note=LGC-0009");
  assert.equal(LGC.cashAppLink("", 4200), "");
  assert.equal(LGC.venmoLink("", 4200), "");
});

test("an unpaid invoice shows the services, the total and how to pay, with tap-to-pay links", () => {
  const { out } = pdf({});
  for (const s of ["(INVOICE)", "(LGC-0009)", "(Maria Gonzalez)", "(Interior)", "(SUV / truck size)", "(Air freshener)", "($42.00)", "(HOW TO PAY)", "(Tap or scan to pay $42.00)",
    "(Or pay cash in person.)", "(Thanks for having me out!)", "(See you next month.)", "(Questions? Call or text \\(845\\) 282-9387)"]) assert.ok(out.includes(s), s);
  assert.ok(out.includes("/URI (https://cash.app/$AndrewLetta/42)"), "Cash App link");
  assert.ok(out.includes("/URI (https://venmo.com/?txn=pay&recipients=Andrew-Letts-9&amount=42.00&note=LGC-0009)"), "Venmo link");
  assert.ok(!out.includes("PAID IN FULL"));
});

test("a partly paid invoice shows what's paid and the balance, and the links ask for the balance", () => {
  const { out } = pdf({ paid: 2000, balance: 2200, status: "Partially Paid",
    pay: [{ label: "Cash App", handle: "$AndrewLetta", link: LGC.cashAppLink("$AndrewLetta", 2200) }] });
  for (const s of ["(Paid)", "(-$20.00)", "(Balance due)", "($22.00)", "(Tap or scan to pay $22.00)", "(Partially Paid)"]) assert.ok(out.includes(s), s);
});

test("a paid invoice says PAID IN FULL and asks for nothing", () => {
  const { out } = pdf({ paid: 4200, balance: 0, status: "Paid" });
  assert.ok(out.includes("(PAID IN FULL)"));
  assert.ok(!out.includes("HOW TO PAY") && !out.includes("cash.app/"), "no payment request once paid");
});

test("a quote says QUOTE, has no balance, and only lists how to pay later", () => {
  const { out } = pdf({ kind: "quote", number: "Q-0001", due: null, status: "Sent" });
  assert.ok(out.includes("(QUOTE)") && out.includes("(Quote total)") && out.includes("(PAYMENT AFTER THE JOB)"));
  assert.ok(!out.includes("Balance due") && !out.includes("HOW TO PAY") && !out.includes("(Due)"));
});

test("discounts, tax and tips print with their labels", () => {
  const { out } = pdf({ totals: { subtotal: 8000, discount: 800, discountLabel: "Discount 10%", tax: 585, taxLabel: "Sales tax 8.125%", tip: 1000, total: 8785 }, balance: 8785 });
  for (const s of ["(Discount 10%)", "(-$8.00)", "(Sales tax 8.125%)", "($5.85)", "(Tip)", "($10.00)", "($87.85)"]) assert.ok(out.includes(s), s);
});

test("a long invoice runs onto more pages, numbered, and keeps every line", () => {
  const items = Array.from({ length: 40 }, (_, i) => ({ name: "Service line " + (i + 1), qty: 1, unit_cents: 100 }));
  const { doc, out } = pdf({ items, totals: { subtotal: 4000, discount: 0, tax: 0, tip: 0, total: 4000 }, balance: 4000 });
  assert.ok(doc.getNumberOfPages() >= 2);
  assert.match(out, new RegExp("page 1 of " + doc.getNumberOfPages() + "\\)"));
  assert.match(out, new RegExp("page " + doc.getNumberOfPages() + " of " + doc.getNumberOfPages() + "\\)"));
  for (let i = 1; i <= 40; i++) assert.ok(out.includes("(Service line " + i + ")"), "line " + i);
});

test("emoji and other characters the PDF font can't draw are left out instead of breaking it", () => {
  assert.equal(LGCPdf.clean("Maria 😀 Gonzalez"), "Maria Gonzalez");
  assert.equal(LGCPdf.clean("José’s “Café” — 2 × wax"), "José’s “Café” — 2 × wax");
  assert.equal(LGCPdf.clean("−$5\nnext"), "-$5 next");
  const { out } = pdf({ customer: { name: "Maria 😀 Gonzalez", phone: "", email: "", address: "" } });
  assert.ok(out.includes("(Maria Gonzalez)"));
});

test("a broken logo picture leaves the logo off instead of failing", () => {
  assert.doesNotThrow(() => pdf({ logo: "data:image/png;base64,AAAA" }));
});
