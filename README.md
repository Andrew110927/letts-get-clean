# Letts Get Clean

Website for Letts Get Clean, mobile car detailing in Orange County, NY.

- Live site: https://andrew110927.github.io/letts-get-clean/
- Review link to text customers: https://andrew110927.github.io/letts-get-clean/#review
- `index.html` is the whole site (no build step). GitHub Pages serves it from `main`.
- `media/` holds the photos and videos. License plates are blurred; keep it that way for any new media.

## How it works

- **Bookings** go into the `bookings` table in Supabase (project `letts-get-clean`). Visitors can add a booking
  but can't read anyone's details. A unique index stops two bookings on the same day and time.
  After booking, the customer is asked to text Andrew the details so he sees it right away.
- **Busy times** come from the `busy_slots()` function, so booked times show as taken.
- **Prices, hours, days off and social links** are read from the `site_settings` row, which the owner dashboard
  (the "Letts Get Clean" Claude artifact) edits. If that can't load, the site uses the defaults in the `DEFAULTS`
  block near the top of the script.
- **Reviews** are posted to the `reviews` table and only appear after they're approved in the dashboard.

`supabase/migrations/` has the SQL for the `reviews` and `site_settings` tables.

## Changing things

- Prices, hours, days off, social links: use the dashboard's Settings tab (updates the live site right away).
- Before/after photos: add the files to `media/` and an entry to `GALLERY` in `index.html`.
