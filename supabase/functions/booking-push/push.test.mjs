// Tests the booking-push function's own modules in Node 24+ (it strips the TypeScript types; both modules
// use only Web Crypto and Intl, same as in Deno). Alerts are decrypted with http_ece, the reference implementation.
// Run from the repo root:  npm install --no-save http_ece@1.2.0 && node supabase/functions/booking-push/push.test.mjs
import assert from "node:assert/strict";
import ece from "http_ece";
import { createECDH, randomBytes } from "node:crypto";
import { buildPushRequest, b64u, unb64u } from "./webpush.ts";
import { bookingAlert, when } from "./message.ts";

const { subtle } = globalThis.crypto;
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log("ok  " + name); }

// Server keys exported the way we store them: private JWK JSON (Edge Function secret), public raw base64url (config.js).
const vapidPair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const privateJWK = JSON.parse(JSON.stringify(await subtle.exportKey("jwk", vapidPair.privateKey)));
const publicRaw = new Uint8Array(await subtle.exportKey("raw", vapidPair.publicKey));
const vapid = { privateJWK, subject: "https://andrew110927.github.io/letts-get-clean/" };

// A phone: ECDH key pair + 16-byte auth secret, as PushSubscription.toJSON() gives them.
function phone(endpoint) {
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, sub: { endpoint, p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } };
}
function decrypt(p, body) {
  return JSON.parse(ece.decrypt(Buffer.from(body), { version: "aes128gcm", privateKey: p.ecdh, authSecret: p.auth }).toString("utf8"));
}
async function verifyJwt(header, endpoint) {
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert.ok(m, "Authorization must be 'vapid t=..., k=...'");
  assert.equal(m[2], b64u(publicRaw), "k= must be the public key phones subscribe with");
  const [h64, c64, s64] = m[1].split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h64, "base64url")), { typ: "JWT", alg: "ES256" });
  const claims = JSON.parse(Buffer.from(c64, "base64url"));
  const pub = await subtle.importKey("raw", publicRaw, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.ok(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, unb64u(s64), new TextEncoder().encode(h64 + "." + c64)), "JWT signature must verify");
  return claims;
}
const message = { title: "New booking", body: "Maria Gonzalez, Sat Oct 25 3 PM, The Full Detail", url: "./#/jobs", tag: "booking-1" };

for (const endpoint of ["https://fcm.googleapis.com/fcm/send/abc:def", "https://web.push.apple.com/QK7abc", "https://updates.push.services.mozilla.com/wpush/v2/xyz"]) {
  await test("decrypts and signs for " + new URL(endpoint).host, async () => {
    const p = phone(endpoint);
    const { url, init } = await buildPushRequest(p.sub, message, vapid);
    assert.equal(url, endpoint);
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Encoding"], "aes128gcm");
    assert.equal(init.headers.TTL, "43200");
    assert.equal(init.headers.Urgency, "high");
    assert.deepEqual(decrypt(p, init.body), message);
    const claims = await verifyJwt(init.headers.Authorization, endpoint);
    assert.equal(claims.aud, new URL(endpoint).origin, "aud must be the push service origin");
    assert.equal(claims.sub, vapid.subject);
    const left = claims.exp - Date.now() / 1000;
    assert.ok(left > 11 * 3600 && left <= 12 * 3600 + 5, "token must expire in about 12h, never past 24h");
  });
}

await test("each send uses a fresh salt and key, so two identical alerts look different", async () => {
  const p = phone("https://fcm.googleapis.com/fcm/send/x");
  const a = (await buildPushRequest(p.sub, message, vapid)).init.body, b = (await buildPushRequest(p.sub, message, vapid)).init.body;
  assert.notDeepEqual(a.slice(0, 86), b.slice(0, 86));
  assert.deepEqual(decrypt(p, a), decrypt(p, b));
});

await test("handles names with accents and emoji", async () => {
  const p = phone("https://web.push.apple.com/y");
  const m = { ...message, body: "José Núñez 🚗, Sun Oct 26 1:30 PM, Interior" };
  assert.deepEqual(decrypt(p, (await buildPushRequest(p.sub, m, vapid)).init.body), m);
});

await test("a phone can't read an alert meant for another phone", async () => {
  const a = phone("https://fcm.googleapis.com/fcm/send/a"), b = phone("https://fcm.googleapis.com/fcm/send/b");
  const body = (await buildPushRequest(a.sub, message, vapid)).init.body;
  assert.throws(() => decrypt(b, body));
});

await test("rejects a message too big for one record", async () => {
  const p = phone("https://fcm.googleapis.com/fcm/send/z");
  await assert.rejects(buildPushRequest(p.sub, { body: "x".repeat(5000) }, vapid), /too long/);
});

await test("rejects a broken subscription key instead of sending garbage", async () => {
  const p = phone("https://fcm.googleapis.com/fcm/send/z");
  await assert.rejects(buildPushRequest({ ...p.sub, p256dh: "AAAA" }, message, vapid));
});

await test("rejects a VAPID key with the private part missing", async () => {
  const p = phone("https://fcm.googleapis.com/fcm/send/z");
  const { d, ...publicOnly } = privateJWK;
  await assert.rejects(buildPushRequest(p.sub, message, { ...vapid, privateJWK: publicOnly }));
});

await test("alert text matches the app's day and time wording", async () => {
  assert.equal(when("2026-10-25", "15:00"), "Sun Oct 25 3 PM");
  assert.equal(when("2026-10-31", "13:30"), "Sat Oct 31 1:30 PM");
  assert.equal(when("2026-11-02", "00:05"), "Mon Nov 2 12:05 AM");
  assert.equal(when("2026-11-02", "12:00"), "Mon Nov 2 12 PM");
  assert.equal(when("2026-11-02", ""), "Mon Nov 2", "a missing time leaves just the day");
});

await test("alert reads 'New booking: name, day time, package' and opens Jobs", async () => {
  const b = { id: "6f1c2b0e-0000-4000-8000-000000000001", name: "Maria Gonzalez", date: "2026-10-31", time: "17:30", package: "The Full Detail" };
  assert.deepEqual(bookingAlert(b), { title: "New booking", body: "Maria Gonzalez, Sat Oct 31 5:30 PM, The Full Detail", url: "./#/jobs", tag: "booking-" + b.id });
  assert.equal(bookingAlert({ ...b, package: null }).body, "Maria Gonzalez, Sat Oct 31 5:30 PM", "no package, no dangling comma");
});

console.log(`\n${passed} passed`);
