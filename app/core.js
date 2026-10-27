// Plain logic the owner app shares with its tests (node --test "tests/*.test.mjs"): no screens, no database.
(function (root) {
  "use strict";

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

  const LGC = { phoneKey, vehicleLabel, isEmail, customerMatches };
  if (typeof module === "object" && module.exports) module.exports = LGC; else root.LGC = LGC;
})(this);
