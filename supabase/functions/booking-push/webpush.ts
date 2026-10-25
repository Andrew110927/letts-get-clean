// Web Push on Web Crypto alone: RFC 8291 payload encryption (aes128gcm) and RFC 8292 VAPID sign-in.
// Hand-rolled because web-push needs Node's crypto.createECDH, which Supabase's Deno runtime lacks,
// and the Web Crypto alternatives still send the old "aesgcm" draft format.
// Checked against the http_ece reference decoder; see README "Booking alerts".

export type Subscription = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { privateJWK: JsonWebKey; subject: string };

const enc = new TextEncoder();
const RECORD_SIZE = 4096;
// Push services reject a VAPID token that lives longer than 24 hours; stay well under.
const TOKEN_HOURS = 12;

export function b64u(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

// Proves to the push service that we hold the private half of the key the phone subscribed with.
async function vapidHeader(endpoint: string, { privateJWK, subject }: Vapid): Promise<string> {
  const json = (o: object) => b64u(enc.encode(JSON.stringify(o)));
  const unsigned = json({ typ: "JWT", alg: "ES256" }) + "." +
    json({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600, sub: subject });
  const key = await crypto.subtle.importKey("jwk", { ...privateJWK, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));
  const publicKey = concat(new Uint8Array([4]), unb64u(privateJWK.x!), unb64u(privateJWK.y!));
  return `vapid t=${unsigned}.${b64u(signature)}, k=${b64u(publicKey)}`;
}

// Encrypts the message so only that phone can read it: one aes128gcm record keyed by an ECDH exchange
// between a throwaway key pair and the phone's p256dh key, mixed with the phone's auth secret.
async function encrypt(sub: Subscription, plaintext: Uint8Array): Promise<Uint8Array> {
  if (plaintext.length > RECORD_SIZE - 17) throw new Error("Push message is too long");
  const uaPublic = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // The 0x02 byte marks this as the last (and only) record.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  // Header: salt (16) | record size (4) | key id length (1) | our public key (65)
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  return concat(header, asPublic, sealed);
}

// Everything needed to POST one notification; the caller does the fetch so it can handle each phone's answer.
export async function buildPushRequest(sub: Subscription, payload: unknown, vapid: Vapid, ttlSeconds = 12 * 3600) {
  const body = await encrypt(sub, enc.encode(JSON.stringify(payload)));
  return {
    url: sub.endpoint,
    init: {
      method: "POST",
      headers: {
        Authorization: await vapidHeader(sub.endpoint, vapid),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttlSeconds),
        Urgency: "high"
      },
      body
    }
  };
}
