# Letts Get Clean

Website and owner app for Letts Get Clean: mobile car detailing, bike and e-bike details, and house pressure
washing in Orange County, NY.

- Live site: https://andrew110927.github.io/letts-get-clean/
- Owner app: https://andrew110927.github.io/letts-get-clean/app/ (demo with sample data: add `?demo`)
- Review link to text customers: https://andrew110927.github.io/letts-get-clean/#review
- `index.html` is the whole site (no build step). GitHub Pages serves it from `main`.
- `media/` holds the photos and videos. License plates are blurred; keep it that way for any new media.

## How it works

- **Bookings** go into the `bookings` table in Supabase (project `letts-get-clean`). Visitors can add a booking
  but can't read anyone's details. A unique index stops two bookings on the same day and time.
  After booking, the customer is asked to text Andrew the details so he sees it right away.
- **Services**: each booking has a `service`: `car` (packages, sizes and extras), `bike` ($20, regular bike or
  e-bike) or `house` (full house pressure wash, $300). Bike and house prices live in `site_settings` too.
- **A house wash takes the whole day.** The `bookings_whole_day` trigger refuses a house wash on a day that already
  has a booking, and any booking on a day a house wash holds. It locks per day, so two people booking at the same
  moment can't both get it. The website and app only offer free days, and both read the refusal as "that day's taken".
- **Busy times** come from the `busy_slots()` function, so booked times show as taken. Its `all_day` column marks
  days a house wash holds.
- **Prices, hours, days off and social links** are read from the `site_settings` row, which the owner app
  (and the older "Letts Get Clean" Claude artifact) edits. If that can't load, the site uses the defaults in the
  `DEFAULTS` block near the top of the script.
- **Reviews** are posted to the `reviews` table and only appear after they're approved in the owner app.
- **Customers** live in `customers` (name, phone, email, address, notes) with their `vehicles`. Every new booking,
  from the website or the app, is filed under its customer by phone number (last 10 digits) and its car under that
  customer's vehicles; someone new becomes a customer automatically (`link_booking_customer()` trigger). If that ever
  fails, the booking still saves. Customers and vehicles are hidden (archived), never deleted.
- **Invoices, quotes and payments** (`invoices`, `payments`, `invoice_settings`) are owner-only and can't be deleted,
  only voided. Money is in whole cents. The database numbers invoices and quotes, refuses $0 or mismatched totals,
  and won't let payments add up past an invoice's total.
- **Money in** is counted from payments, on the day they were paid. Jobs marked Done before invoices existed
  (or without one) count from the booking's total and tip instead. Once a job has an invoice, only its payments
  count, so nothing is added twice (`moneyIn()` in `app/core.js`).

`supabase/migrations/` has the SQL for every table and policy. `supabase/functions/` has the Edge Functions.

## Owner app (`app/`)

An installable phone app (PWA) for running the business: open the link on a phone, then "Add to Home Screen".
No build step: plain HTML, CSS and JavaScript, with supabase-js from a CDN.

| Tab | What it does |
| --- | --- |
| Today | Next job with navigate / call / text / done, requests to confirm, week stats, quick actions |
| Jobs | All bookings by day; confirm, text, mark done with tip and payment, edit, cancel, add phone bookings |
| Clients | Customer records: phone, email, address, notes (gate codes, where the hose is), one or more vehicles, quick search (name, phone, car, town), visits, spend, full history, "due for a detail" rebook nudges, add / edit / hide |
| Invoices | Invoices and quotes (LGC-0001, Q-0001…): pick a customer, car and services in one screen; packages priced by the job date (launch through the deal's last day, regular after); sizes, extras, bike, house wash and custom lines; per-line price changes; $ or % discount, tip, tax; Draft / Sent / Overdue / Void; duplicate; quote → invoice in one tap. "Done" on a job opens its invoice filled in at the price the customer booked. Payments: "Paid now?" when saving, one tap "paid in full" by method (Cash, Cash App, Venmo, Other), part payments with any amount and date, balance due, Paid / Partially Paid worked out from the payments, extra cash added as a tip, payments removed (never deleted). Sending: a branded PDF (logo, brand color, services, totals, balance, Cash App / Venmo tap-to-pay links and QR codes with the amount filled in, or PAID IN FULL) shared through the phone's share menu, opened to print, or a text / email with tap-to-pay links. Sharing marks a draft as sent. A website discount on a booking shows as its own discount line |
| More | Money (what came in this week / month / year / all time from invoice payments, profit after expenses, tips, jobs completed, average job, who owes you with late invoices first, unsent drafts, most popular package, last 8 weeks, how customers paid), Social (post templates from live data, planner, share-to-app posting, follower log, where bookings come from), Reviews (approve, hide, ask), Settings (updates the website live), Invoice settings (owner-only), Booking alerts (phone buzzes for new bookings) |

- **Sign-in**: Supabase Auth, email + password. Only emails listed in `owner_emails` (with a confirmed address) can
  read or change anything; any other account sees nothing. Add an owner in the Supabase SQL editor:
  `insert into public.owner_emails (email) values ('owner@example.com');`
- **Offline**: `sw.js` caches the app files; the app keeps its last-loaded data on the phone, so it opens with no signal.
- **Demo**: `app/?demo` runs every screen on sample data in memory. Nothing is saved.
- **Rebranding**: everything business-specific (name, colors, owner, links, Supabase project, message templates,
  hashtags, default prices) is in `app/config.js`. Swap that file and the icons in `app/icons/` to reuse the app
  for another detailer with the same tables.
- **Updating**: bump `VERSION` in `app/sw.js` when shipping changes so installed apps pick them up.

## Booking alerts (push notifications)

When a customer books on the website, the owner's phone buzzes with "New booking: name, day time, package",
even with the app closed. Tapping it opens the app on Jobs.

1. **Turn on**: owner app → More → Booking alerts. It asks for notification permission and saves that phone's push
   subscription in `push_subscriptions` (owner only). Each phone turns it on separately. Signing out turns it off on that phone.
2. **Trigger**: a new row in `bookings` runs `alert_new_booking()`, which uses `pg_net` to call the `booking-push`
   Edge Function with just the booking id. Bookings the owner adds in the app don't alert. If the alert fails, the
   booking still saves.
3. **Send**: `supabase/functions/booking-push/` re-reads the booking (it trusts nothing the caller sends, and only
   alerts about bookings made in the last 10 minutes), encrypts the alert for each saved phone and posts it to that
   phone's push service (Apple, Google or Mozilla). Phones that unsubscribed are removed automatically.

- **iPhone**: only works in the app added to the home screen (Safari → Share → Add to Home Screen), iOS 16.4 or newer.
  Android: Chrome, installed or not.
- **Keys**: Web Push needs a VAPID key pair. The public half is `push.publicKey` in `app/config.js`. The private half
  is the Edge Function secret `VAPID_PRIVATE_KEY`, a one-line JSON key (`{"kty":"EC","crv":"P-256",...}`). It never
  goes in the repo or the database.

One-time setup (already done for Letts Get Clean once the alerts work):

1. Apply `supabase/migrations/20261025_booking_alerts.sql`.
2. Deploy the function with JWT checks off, because it checks each request itself:
   `supabase functions deploy booking-push --no-verify-jwt`
3. Add the secret: Supabase dashboard → Edge Functions → Secrets → `VAPID_PRIVATE_KEY`.

New key pair (rebranding, or if the private key leaks): run this, put `publicKey` in `app/config.js` and
`VAPID_PRIVATE_KEY` in the Edge Function secrets. Phones switch to the new key the next time the app opens.

```bash
node -e "crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign']).then(async k=>{const j=await crypto.subtle.exportKey('jwk',k.privateKey);console.log('VAPID_PRIVATE_KEY='+JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d}));console.log('publicKey='+Buffer.from(await crypto.subtle.exportKey('raw',k.publicKey)).toString('base64url'))})"
```

When reusing the app for another business, also change the function URL in the migration and the contact URL in
`supabase/functions/booking-push/index.ts`.

## Tests

Node 24+. One install, then the app logic and database rules (`tests/`, run against an in-memory Postgres with the
same migrations, never the live data) and the push encryption (checked against the `http_ece` reference decoder):

```bash
npm install --no-save --no-package-lock @electric-sql/pglite@0.5.8 http_ece@1.2.0 jspdf@3.0.3 qrcode-generator@1.4.4
```

```bash
node --test "tests/*.test.mjs" supabase/functions/booking-push/push.test.mjs
```

## Changing things

- Prices (car packages, bike detail, house wash), hours, days off, social links: owner app → More → Settings
  (updates the live site right away).
- Extras (add pet hair removal, engine bay…): More → Settings → Extras & add-on services. New ones start as
  "Invoices only"; flip the switch to offer one on the website too (stored as `web: false` in `site_settings.addons`).
- What prints on invoices (business name, phone, email, website, Cash App / Venmo, tax %, number prefixes, overdue
  days, thank-you note, terms, logo, brand color): More → Invoice settings. Saved in the owner-only `invoice_settings` row.
  The PDF is drawn on the phone by `app/pdf.js` with jsPDF 3.0.3 and qrcode-generator 1.4.4, loaded from jsDelivr the
  first time with integrity hashes (pinned in `PDF_LIBS` in `app/app.js`). The home address is never printed.
- Text for invoice, receipt and quote messages: `messages.invoice`, `messages.receipt`, `messages.quote` in `app/config.js`.
- Text message wording: `messages` in `app/config.js`.
- Before/after photos: add the files to `media/` and an entry to `GALLERY` in `index.html`.
