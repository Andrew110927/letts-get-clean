// What the alert says, kept apart from the Deno glue so it can be tested anywhere.
export type Booking = { id: string; name: string; date: string; time: string; package: string | null };

// Same wording as the app: "Sat Oct 25 3 PM", "Sun Oct 26 5:30 PM".
export function when(date: string, time: string): string {
  const day = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).replace(",", "");
  const m = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!m) return day;
  const H = Number(m[1]);
  return `${day} ${(H + 11) % 12 + 1}${m[2] === "00" ? "" : ":" + m[2]} ${H < 12 ? "AM" : "PM"}`;
}

// Reads as "New booking / Maria Gonzalez, Sat Oct 25 3 PM, The Full Detail" on the lock screen.
// tag keeps a retried alert from showing twice; url is where a tap lands (resolved by sw.js).
export function bookingAlert(b: Booking) {
  return {
    title: "New booking",
    body: [b.name, when(b.date, b.time), b.package].filter(Boolean).join(", "),
    url: "./#/jobs",
    tag: "booking-" + b.id
  };
}
