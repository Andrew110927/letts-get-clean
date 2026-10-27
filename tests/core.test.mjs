// The owner app's plain logic (app/core.js). Run: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import LGC from "../app/core.js";

test("phone keys match the database: last 10 digits, any formatting", () => {
  assert.equal(LGC.phoneKey("(845) 555-0101"), "8455550101");
  assert.equal(LGC.phoneKey("+1 845.555.0101"), "8455550101");
  assert.equal(LGC.phoneKey("18455550101"), "8455550101");
  assert.equal(LGC.phoneKey(""), null);
  assert.equal(LGC.phoneKey(null), null);
  assert.equal(LGC.phoneKey("555-0101"), "5550101");
});

test("vehicle labels read year, color, make, model and skip blanks", () => {
  assert.equal(LGC.vehicleLabel({ year: 2019, color: "Black", make: "Honda", model: "CR-V" }), "2019 Black Honda CR-V");
  assert.equal(LGC.vehicleLabel({ make: "Infiniti", model: "G37" }), "Infiniti G37");
  assert.equal(LGC.vehicleLabel({ model: "Black truck", color: " " }), "Black truck");
  assert.equal(LGC.vehicleLabel(null), "");
});

test("emails need a name, an @ and a domain", () => {
  assert.ok(LGC.isEmail("ann@example.com"));
  assert.ok(LGC.isEmail("  ann.d+cars@mail.co.uk "));
  for (const bad of ["", "ann", "ann@", "ann@example", "ann @example.com"]) assert.equal(LGC.isEmail(bad), false, bad);
});

test("customer search finds names, towns, cars, notes and phone numbers", () => {
  const ann = { name: "Ann Dubois", phone: "(845) 555-0101", email: "ann@example.com", town: "Newburgh", notes: "Gate code 4410" };
  const cars = [{ year: 2019, make: "Honda", model: "CR-V" }, { model: "Truck" }];
  const finds = (q) => LGC.customerMatches(ann, cars, q);
  for (const q of ["", "ann", "DUBOIS", "ann newburgh", "honda", "cr-v", "truck", "gate code", "example.com", "0101", "845-555", "(845) 555"]) assert.ok(finds(q), q);
  for (const q of ["frank", "toyota", "ann goshen", "0102"]) assert.equal(finds(q), false, q);
  // Digits inside words (a gate code, a year) are text, not a phone search.
  assert.ok(finds("4410"), "4410 is in the notes, not the phone");
});
