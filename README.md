# Letts Get Clean

Website and owner app for Letts Get Clean, mobile car detailing in Orange County, NY.

- Live site: https://andrew110927.github.io/letts-get-clean/
- Owner app: https://andrew110927.github.io/letts-get-clean/app/ (demo with sample data: add `?demo`)
- Review link to text customers: https://andrew110927.github.io/letts-get-clean/#review
- `index.html` is the whole site (no build step). GitHub Pages serves it from `main`.
- `media/` holds the photos and videos. License plates are blurred; keep it that way for any new media.

## How it works

- **Bookings** go into the `bookings` table in Supabase (project `letts-get-clean`). Visitors can add a booking
  but can't read anyone's details. A unique index stops two bookings on the same day and time.
  After booking, the customer is asked to text Andrew the details so he sees it right away.
- **Busy times** come from the `busy_slots()` function, so booked times show as taken.
- **Prices, hours, days off and social links** are read from the `site_settings` row, which the owner app
  (and the older "Letts Get Clean" Claude artifact) edits. If that can't load, the site uses the defaults in the
  `DEFAULTS` block near the top of the script.
- **Reviews** are posted to the `reviews` table and only appear after they're approved in the owner app.

`supabase/migrations/` has the SQL for every table and policy. `supabase/functions/` has the Edge Functions.

## Owner app (`app/`)

An installable phone app (PWA) for running the business: open the link on a phone, then "Add to Home Screen".
No build step: plain HTML, CSS and JavaScript, with supabase-js from a CDN.

| Tab | What it does |
| --- | --- |
| Today | Next job with navigate / call / text / done, requests to confirm, week stats, quick actions |
| Jobs | All bookings by day; confirm, text, mark done with tip and payment, edit, cancel, add phone bookings |
| Clients | Customers grouped by phone: visits, spend, history, "due for a detail" rebook nudges |
| Social | Post templates built from live data (open spots, prices, before/after, reviews, tips), a post planner, share-to-app posting, follower log, where bookings come from |
| More | Money (earnings, tips, expenses, profit), Reviews (approve, hide, ask), Settings (updates the website live), Booking alerts (phone buzzes for new bookings) |

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

Tests for the encryption and alert text (Node 24+, checked against the `http_ece` reference decoder):

```bash
npm install --no-save --no-package-lock http_ece@1.2.0 && node supabase/functions/booking-push/push.test.mjs
```

## Changing things

- Prices, hours, days off, social links: owner app → More → Settings (updates the live site right away).
- Text message wording: `messages` in `app/config.js`.
- Before/after photos: add the files to `media/` and an entry to `GALLERY` in `index.html`.
