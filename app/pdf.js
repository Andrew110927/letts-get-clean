// The customer's invoice or quote as a PDF (jsPDF): white Letter page, brand-color header, itemized services,
// totals, and tap-or-scan Cash App / Venmo links. It draws only what it's handed, and the owner's home address is
// never part of that, so it can't end up on paper. Used by app.js in the browser and tests/pdf.test.mjs in Node.
(function (root) {
  "use strict";
  const W = 612, H = 792, M = 40, R = W - M;
  const INK = "#0B1220", MUTED = "#5B6472", RULE = "#DDE2E8";

  // The PDF's built-in Helvetica only has Western European letters (WinAnsi). Swap common look-alikes and drop
  // anything else (emoji, other alphabets) instead of printing garbage.
  const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  function clean(s) {
    return String(s == null ? "" : s).replace(/[−‐‑]/g, "-").replace(/[\t\r\n]/g, " ")
      .replace(/[^\x20-\x7E -ÿ]/gu, (ch) => WINANSI_EXTRA.includes(ch) ? ch : "").replace(/\s+/g, " ").trim();
  }
  const rgb = (hex) => { const n = parseInt(String(hex || "#29C8FF").slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const tint = (hex, t) => rgb(hex).map(v => Math.round(v + (255 - v) * t));
  // Dark text on a light brand color, white text on a dark one.
  function inkOn(hex) { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? INK : "#FFFFFF"; }

  function drawQR(doc, qrcode, url, x, y, size) {
    const q = qrcode(0, "M"); q.addData(url); q.make();
    const n = q.getModuleCount(), cell = size / n;
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x + c * cell, y + r * cell, cell + 0.25, cell + 0.25, "F");
  }

  // d: { kind, number, status, issued, jobDate, due, where, business: { name, tagline, phone, email, website },
  //      customer: { name, phone, email, address }, vehicle, items: [{ name, qty, unit_cents }],
  //      totals: { subtotal, discount, discountLabel, tax, taxLabel, tip, total }, paid, balance,
  //      pay: [{ label, handle, link }], notes, thanks, terms, accent, logo }
  function build(d, libs) {
    const { jsPDF, qrcode, LGC } = libs, $ = (c) => LGC.fmtCents(c), quote = d.kind === "quote";
    const doc = new jsPDF({ unit: "pt", format: "letter", compress: d.compress !== false });
    const accent = d.accent || "#29C8FF", band = inkOn(accent);
    doc.setProperties({ title: (quote ? "Quote " : "Invoice ") + d.number, subject: clean(d.business.name), author: clean(d.business.name), creator: "LGC Pro" });
    const color = (hex) => doc.setTextColor(...rgb(hex));
    const font = (style, size) => { doc.setFont("helvetica", style); doc.setFontSize(size); };
    const text = (s, x, y, o) => doc.text(clean(s), x, y, o);
    const rule = (y, x1, x2) => { doc.setDrawColor(...rgb(RULE)); doc.setLineWidth(0.8); doc.line(x1 == null ? M : x1, y, x2 == null ? R : x2, y); };
    const label = (s, x, y, o) => { color(MUTED); font("bold", 8.5); doc.setCharSpace(0.8); text(s.toUpperCase(), x, y, o); doc.setCharSpace(0); };

    // ---- Header band: logo, business name, contact; INVOICE / QUOTE and the number on the right ----
    doc.setFillColor(...rgb(accent)); doc.rect(0, 0, W, 112, "F");
    let tx = M;
    if (d.logo) {
      try {
        // Fit inside 60pt tall and 120pt wide, keeping the logo's shape.
        const p = doc.getImageProperties(d.logo), k = Math.min(120 / p.width, 60 / p.height), w = p.width * k, lh = p.height * k;
        doc.addImage(d.logo, M, 26 + (60 - lh) / 2, w, lh); tx = M + w + 14;
      } catch (e) { /* a bad picture just leaves the logo off */ }
    }
    color(band); font("bold", 22); text(d.business.name, tx, 50);
    font("normal", 10.5);
    if (d.business.tagline) text(d.business.tagline, tx, 68);
    const contact = [d.business.phone, d.business.email, d.business.website].filter(Boolean).map(clean).join("   ·   ");
    if (contact) text(contact, tx, 90);
    font("bold", 26); text(quote ? "QUOTE" : "INVOICE", R, 48, { align: "right" });
    font("normal", 12); text(d.number, R, 68, { align: "right" });

    // ---- Bill to (left) and details (right) ----
    let y = 146, ly, ry;
    label("Bill to", M, y); label(quote ? "Quote details" : "Invoice details", 340, y);
    ly = y + 20; color(INK); font("bold", 13); text(d.customer.name, M, ly);
    font("normal", 10.5); color("#2A3240");
    for (const line of [d.customer.phone, d.customer.email, d.customer.address, d.vehicle ? "Vehicle: " + d.vehicle : null].filter(Boolean)) {
      for (const part of doc.splitTextToSize(clean(line), 270)) { ly += 15; text(part, M, ly); }
    }
    ry = y + 6;
    const details = [["Number", d.number], [quote ? "Quote date" : "Invoice date", d.issued], ["Job date", d.jobDate], quote ? null : ["Due", d.due], ["Service", d.where], ["Status", d.status]].filter(r => r && r[1]);
    for (const [k, v] of details) { ry += 15; color(MUTED); font("normal", 10); text(k, 340, ry); color(INK); font("bold", 10.5); text(v, R, ry, { align: "right" }); }
    y = Math.max(ly, ry) + 26;

    // ---- Items ----
    const head = () => {
      doc.setFillColor(...tint(accent, 0.82)); doc.rect(M, y, R - M, 24, "F");
      color(INK); font("bold", 9); doc.setCharSpace(0.6);
      text("DESCRIPTION", M + 10, y + 16); text("QTY", 372, y + 16, { align: "right" }); text("PRICE", 466, y + 16, { align: "right" }); text("AMOUNT", R - 10, y + 16, { align: "right" });
      doc.setCharSpace(0); y += 24;
    };
    const newPage = () => { doc.addPage(); y = 50; };
    head();
    for (const it of d.items) {
      font("normal", 11);
      const lines = doc.splitTextToSize(clean(it.name), 290), rowH = Math.max(28, lines.length * 14 + 14);
      if (y + rowH > H - 80) { newPage(); head(); font("normal", 11); }
      color(INK); lines.forEach((ln, i) => text(ln, M + 10, y + 18 + i * 14));
      text(String(it.qty), 372, y + 18, { align: "right" }); text($(it.unit_cents), 466, y + 18, { align: "right" });
      font("bold", 11); text($(it.unit_cents * it.qty), R - 10, y + 18, { align: "right" });
      y += rowH; rule(y);
    }

    // ---- Totals (right) with a PAID stamp or the balance ----
    const t = d.totals, rows = [["Subtotal", $(t.subtotal)]];
    if (t.discount) rows.push([t.discountLabel || "Discount", "-" + $(t.discount)]);
    if (t.tax) rows.push([t.taxLabel || "Sales tax", $(t.tax)]);
    if (t.tip) rows.push(["Tip", $(t.tip)]);
    const showPaid = !quote && d.paid > 0;
    const need = rows.length * 18 + 40 + (showPaid ? 52 : 0) + (!quote && d.balance > 0 ? 6 : 0);
    if (y + need > H - 90) newPage();
    y += 22; const top = y;
    for (const [k, v] of rows) { color(MUTED); font("normal", 10.5); text(k, 360, y); color(INK); text(v, R - 10, y, { align: "right" }); y += 18; }
    rule(y - 8, 360, R); y += 10;
    color(INK); font("bold", 14); text(quote ? "Quote total" : "Total", 360, y); text($(t.total), R - 10, y, { align: "right" });
    if (showPaid) {
      y += 20; color(MUTED); font("normal", 10.5); text("Paid", 360, y); color(INK); text("-" + $(d.paid), R - 10, y, { align: "right" });
      y += 12; doc.setFillColor(...tint(accent, 0.82)); doc.rect(352, y, R - 352, 28, "F");
      color(INK); font("bold", 13); text("Balance due", 360, y + 19); text($(d.balance), R - 10, y + 19, { align: "right" }); y += 28;
    }
    if (!quote && d.balance === 0) {
      doc.setDrawColor(...rgb(accent)); doc.setLineWidth(2.5); doc.roundedRect(M, top - 14, 200, 58, 8, 8, "S");
      color(INK); font("bold", 20); text("PAID IN FULL", M + 100, top + 16, { align: "center" });
      font("normal", 11); text("Thank you!", M + 100, top + 34, { align: "center" });
    }
    y += 24;

    // ---- How to pay: tap or scan, with the amount filled in ----
    const options = (d.pay || []).filter(p => p.handle);
    if (!quote && d.balance > 0 && options.length) {
      if (y + 140 > H - 90) newPage();
      label("How to pay", M, y); y += 12;
      const colW = (R - M) / 2;
      options.slice(0, 2).forEach((p, i) => {
        const x = M + i * colW, qy = y + 4;
        if (p.link) { drawQR(doc, qrcode, p.link, x, qy, 86); doc.link(x, qy, 86, 86, { url: p.link }); }
        const ix = p.link ? x + 100 : x;
        color(INK); font("bold", 13); text(p.label, ix, qy + 18);
        font("normal", 11); color("#2A3240");
        if (p.link) doc.textWithLink(clean(p.handle), ix, qy + 36, { url: p.link }); else text(p.handle, ix, qy + 36);
        color(MUTED); font("normal", 9.5); text(p.link ? "Tap or scan to pay " + $(d.balance) : "Send " + $(d.balance), ix, qy + 54);
      });
      y += 116; color("#2A3240"); font("normal", 10.5); text("Or pay cash in person.", M, y); y += 24;
    } else if (quote && options.length) {
      label("Payment after the job", M, y); y += 16; color("#2A3240"); font("normal", 10.5);
      text(options.map(p => p.label + " " + clean(p.handle)).join("   ·   ") + "   ·   Cash", M, y); y += 22;
    }

    // ---- Notes ----
    if (d.notes) {
      const lines = String(d.notes).split(/\n+/).flatMap(l => doc.splitTextToSize(clean(l), R - M));
      if (y + 20 + lines.length * 14 > H - 90) newPage();
      label("Notes", M, y); y += 16; color("#2A3240"); font("normal", 10.5);
      for (const ln of lines) { text(ln, M, y); y += 14; }
    }

    // ---- Footer on the last page: thank-you, terms, how to reach the business ----
    if (y > H - 96) newPage();
    rule(H - 84);
    color(INK); font("bold", 12); if (d.thanks) text(d.thanks, W / 2, H - 62, { align: "center" });
    color(MUTED); font("normal", 9);
    if (d.terms) text(d.terms, W / 2, H - 46, { align: "center" });
    if (d.business.phone) text("Questions? Call or text " + (d.business.owner ? clean(d.business.owner) + " at " : "") + clean(d.business.phone), W / 2, H - 32, { align: "center" });
    const pages = doc.getNumberOfPages();
    if (pages > 1) for (let i = 1; i <= pages; i++) { doc.setPage(i); color(MUTED); font("normal", 8.5); text(d.number + "  ·  page " + i + " of " + pages, R, H - 16, { align: "right" }); }
    return doc;
  }

  const LGCPdf = { build, clean };
  if (typeof module === "object" && module.exports) module.exports = LGCPdf; else root.LGCPdf = LGCPdf;
})(this);
