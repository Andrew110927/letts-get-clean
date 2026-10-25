// booking-push: buzzes the owner's phones when a customer books on the website.
// The bookings insert trigger (supabase/migrations/20261025_booking_alerts.sql) calls it with just the booking id.
// The URL is public (verify_jwt is off), so it trusts nothing in the request: it re-reads the booking with the
// secret key and only alerts about one made in the last few minutes. Nobody can push made-up text or replay old bookings.
// Secret to set once: VAPID_PRIVATE_KEY (the private JWK whose public half is push.publicKey in app/config.js).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { bookingAlert } from "./message.ts";
import { buildPushRequest, type Subscription } from "./webpush.ts";

const CONTACT = "https://andrew110927.github.io/letts-get-clean/"; // VAPID contact the push services see
const FRESH_MS = 10 * 60 * 1000;

function secretKey(): string {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    if (key) return key;
  } catch { /* fall through to the legacy key */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}
const db = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "Use POST" });
  const { booking_id } = await req.json().catch(() => ({}));
  if (typeof booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(booking_id)) return reply(400, { error: "booking_id is missing or not a uuid" });

  let privateJWK: JsonWebKey;
  try { privateJWK = JSON.parse(Deno.env.get("VAPID_PRIVATE_KEY") ?? ""); }
  catch { return reply(500, { error: "VAPID_PRIVATE_KEY isn't set (or isn't the whole {...} key) in Edge Function secrets" }); }

  const { data: booking, error } = await db.from("bookings").select("id, name, date, time, package, created_at").eq("id", booking_id).maybeSingle();
  if (error) return reply(500, { error: "Couldn't read the booking: " + error.message });
  if (!booking) return reply(404, { error: "No booking with that id" });
  if (Date.now() - Date.parse(booking.created_at) > FRESH_MS) return reply(409, { error: "That booking is too old to alert about" });

  const { data: subs, error: subsError } = await db.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (subsError) return reply(500, { error: "Couldn't read push subscriptions: " + subsError.message });

  const alert = bookingAlert(booking);
  const results = await Promise.all((subs as Subscription[]).map(async (sub) => {
    try {
      const { url, init } = await buildPushRequest(sub, alert, { privateJWK, subject: CONTACT });
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
      const detail = res.ok ? "" : (await res.text()).slice(0, 200);
      if (res.ok) await res.body?.cancel();
      return { sub, status: res.status, detail };
    } catch (e) {
      return { sub, status: 0, detail: String(e) };
    }
  }));

  // 404/410: that phone dropped the subscription (app deleted, alerts turned off), so stop sending to it.
  const gone = results.filter((r) => r.status === 404 || r.status === 410).map((r) => r.sub.endpoint);
  if (gone.length) await db.from("push_subscriptions").delete().in("endpoint", gone);
  const failed = results.filter((r) => !(r.status >= 200 && r.status < 300) && !gone.includes(r.sub.endpoint));
  // Log the push service host only: the full endpoint works like a password for that phone.
  for (const f of failed) console.error("push failed", new URL(f.sub.endpoint).host, f.status, f.detail);
  return reply(200, { sent: results.length - gone.length - failed.length, removed: gone.length, failed: failed.length });
});
