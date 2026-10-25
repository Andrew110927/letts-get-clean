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

`supabase/migrations/` has the SQL for every table and policy.

## Owner app (`app/`)

An installable phone app (PWA) for running the business: open the link on a phone, then "Add to Home Screen".
No build step: plain HTML, CSS and JavaScript, with supabase-js from a CDN.

| Tab | What it does |
| --- | --- |
| Today | Next job with navigate / call / text / done, requests to confirm, week stats, quick actions |
| Jobs | All bookings by day; confirm, text, mark done with tip and payment, edit, cancel, add phone bookings |
| Clients | Customers grouped by phone: visits, spend, history, "due for a detail" rebook nudges |
| Social | Post templates built from live data (open spots, prices, before/after, reviews, tips), a post planner, share-to-app posting, follower log, where bookings come from |
| More | Money (earnings, tips, expenses, profit), Reviews (approve, hide, ask), Settings (updates the website live) |

- **Sign-in**: Supabase Auth, email + password. Only emails listed in `owner_emails` (with a confirmed address) can
  read or change anything; any other account sees nothing. Add an owner in the Supabase SQL editor:
  `insert into public.owner_emails (email) values ('owner@example.com');`
- **Offline**: `sw.js` caches the app files; the app keeps its last-loaded data on the phone, so it opens with no signal.
- **Demo**: `app/?demo` runs every screen on sample data in memory. Nothing is saved.
- **Rebranding**: everything business-specific (name, colors, owner, links, Supabase project, message templates,
  hashtags, default prices) is in `app/config.js`. Swap that file and the icons in `app/icons/` to reuse the app
  for another detailer with the same tables.
- **Updating**: bump `VERSION` in `app/sw.js` when shipping changes so installed apps pick them up.

## Changing things

- Prices, hours, days off, social links: owner app → More → Settings (updates the live site right away).
- Text message wording: `messages` in `app/config.js`.
- Before/after photos: add the files to `media/` and an entry to `GALLERY` in `index.html`.
