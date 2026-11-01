# Letts Get Clean: compliance and redesign report

Branch `site-policies` (cut from live `main` ee38355). Written October 31, 2026. **Nothing is live yet**: pushing to `main` publishes, and it waits for Andrew's OK. No database changes were made.

## What changed, by area

| # | Area | Status | What was done (files) |
|---|---|---|---|
| 1 | Privacy policy | ✅ | `privacy.html`: what's collected and how, uses, sharing (Supabase, GitHub Pages, Stripe when paying by card), retention, security and breach notice, rights, the privacy request steps (`#request`), children, changes |
| 2 | Terms of service | ✅ | `terms.html`: booking, prices and payment, cancelling, what we need from you, the condition check and existing damage, photos of the work, reviews, site use and IP, liability limits, New York law, Orange County courts |
| 3 | Refund and cancellation | ✅ | `refund-policy.html`: no deposit, free cancelling, weather, if you're not happy, when and how refunds happen, card holds |
| 4 | Cookie policy | ✅ | `cookies.html`: no cookies; table of the two browser-storage items; working "Clear my saved details" and "Forget the QR code tag" buttons (`#settings`) |
| 5 | Consent banner | ✅ Not needed (decided) | Nothing optional loads, so there's nothing to consent to. Google Fonts was the only third party on page load, and it's now self-hosted. The cookie page explains this and how a banner would work if trackers are ever added |
| 6 | Form consents | ✅ | `index.html`: required unticked terms box with links; text-message notice under the phone field; privacy link under the Book button; "Remember my details" unticked by default; required fields marked visibly (*) and in code. *A stored consent record (version and time on each booking) waits on a database change, so it isn't built yet* |
| 7 | Collect only needed data | ✅ | "How did you hear about us?" is optional. Everything else is needed for a mobile job |
| 8 | Third parties and security | ✅ | Fonts self-hosted (`fonts/`); a CSP and referrer policy `<meta>` on every page; `noreferrer` on links that open new tabs. No npm packages ship. *GitHub Pages can't send nosniff or Permissions-Policy headers: remaining risk* |
| 9 | Dark patterns | ✅ | The pre-ticked box is gone; the "(5 stars)" pre-fill on texted reviews is gone; the countdown tied to the real end date became a plain end date |
| 10 | Hidden fees | ✅ | Every price, size surcharge and extra is on one list; "Reg. $35" is now "$35 after Nov 16"; the vehicle switch shows the true total per size; terms say Andrew asks before adding anything |
| 11 | Reviews | ✅ | "Every honest review gets posted, good or bad" is on the site, plus the moderation rule in the terms. *Andrew to confirm Ann is a real customer and to approve negative reviews too* |
| 12 | Claims | ✅ | Nothing unsupported was found; copy kept modest. *Confirm every exterior gets the foam pre-wash* |
| 13 | Alt text and captions | ⚠️ | All images described; the stars are drawn with one text label; the reels have written descriptions. *Reels 1 and 2 have sound and no captions (listed as a known gap on `accessibility.html`)* |
| 14 | Contrast | ✅ | Field edges now 3.6:1 (were about 1.2:1); the footer's blue is now 3.8:1. axe: 0 contrast issues |
| 15 | Keyboard | ✅ | Skip link, visible focus, the calendar as a wrapping grid, labelled controls, menu focus and Esc. The scrolling ticker (which couldn't be paused) was removed |
| 16 | Business details | ✅ | Footer: name, owner, town, phone, text, socials, every policy link, Cookie settings, Privacy request; hours in the contact rows; schema unchanged (public details only); `accessibility.html` |
| 17 | Age and kids | ✅ | Any age welcome. Under 13 needs a parent or guardian to book (FAQ, terms, privacy). Minors' data is limited to what the job needs |
| 18 | Unsubscribe | ✅ N/A | No email list. Texts: "Text STOP any time" is on the form and in the policies |
| 19 | Media licenses | ⚠️ | `MEDIA_LICENSES.md`. *Two unknowns: who made the mascot, and what the reel soundtracks are* |
| 20 | Data deletion | ⚠️ | Privacy request steps on `privacy.html#request`, plus the internal checklist `DATA_REQUESTS.md`. *The one-click "Forget this customer" in LGC Pro needs a database change you haven't approved yet; until then, it's the manual steps in the checklist* |

## The new design (the "make it 1000000 times better" phase)

- **Direction:** *the name as a monument*, dealt by design-taste-frontend (seed 1429003636). Two section layouts were swapped because the dealt ones couldn't hold the real content: pricing became "plans that step up" (three packages, not one plan), and the review became "one long letter" (Ann's review is 21 words). `DESIGN.md` has the full system.
- **Idea:** "Letts Get Clean" reads as "let's get clean", so the name is set across the bottom of the real driveway film and returns cropped in the footer under "Ready for a clean car?".
- **Live thing:** the vehicle switch re-prices all three tiles and carries the choice into the booking form.
- **Kept, unchanged in behaviour:** booking with live open times, two-car booking, military and holiday discounts, the house wash whole-day rule, the waitlist, QR `?src=` tags, booking alerts, the review form, FAQ structured data.
- **Pictures:** only Letts Get Clean's own photos and footage. Nothing found or stock.

## How it was checked

- **design-taste-frontend inspector:** before, 15 FAIL and 8 WARN; after, desktop sizes went from 27 to 7.
  - The official run's last FAIL, "still page", happens because this PC has Windows animations off, so the browser sees "reduce motion". A copy of the inspector that sets motion explicitly passes it.
  - The last "blank gap" sits past the inspector's 11-screen limit. A Playwright full scroll confirms all 42 section entrances fire and end fully visible.
- **design lint:** 0 FAIL. Warnings: Inter is flagged as a default face (it's the brand's), and zero-padding is used for dates.
- **axe-core 4.10:** 0 violations on all six pages at 1440 and at 390.
- **Playwright (playwright-cli):**
  - The keyboard tab order starts with the skip link.
  - The SUV switch re-prices the tiles to $35, $40 and $60 and carries $60 into the quote.
  - An empty booking lists every missing field; the terms box is enforced.
  - A booking dry run with the database call stubbed reaches the confirmation.
  - Nothing is saved locally unless Remember is ticked; the cookie settings clear both items; no console errors.
- **Tests:** `node --test "tests/*.test.mjs"`: 96 of 96 pass.

## What Andrew needs to do (outside the code)

1. **Approve going live** (push `site-policies` to `main`).
2. **Answer the open questions:**
   - legal name and business type (sole proprietor, DBA or LLC)
   - whether to add an email for privacy requests
   - a satisfaction guarantee or re-do window (the policy says only "tell Andrew before you pay")
   - whether prices really rise to $35 / $40 / $70 after Nov 16
   - who made the mascot
   - what the soundtracks on reels 1 and 2 are
   - whether Ann is a real customer
3. **Confirm the defaults written into the policies:**
   - refund replies within 2 days, refunds sent within 7
   - records kept up to 7 years
   - before and after photos with plates blurred and no faces or addresses
   - the condition-check wording
4. **Approve the database change** for a stored terms consent and a "Forget this customer" button (both shown to you before they're applied).
5. **Add captions** to reels 1 and 2, or swap them for silent cuts.
6. **Have a lawyer review** the policy pages, especially the sections listed below.
7. Optional: an OpenRouter key for the image skills (see `design/image-prompts.md`).

## Sections that most need a lawyer

- Terms: limits of our liability; disputes (governing law and venue); existing damage and the condition check.
- Refund policy: the refund timelines.
- Privacy: retention ("up to 7 years"), the breach notice wording, and the minors and children wording.
- The photos-of-the-work clause.

## Remaining risks

- The Stripe branch (`site-features`) was built on the old page and will conflict with this redesign. It needs the booking-form changes reapplied, and `app/sw.js` must go to v15+.
- GitHub Pages can't set some security headers.
- Unknown licenses: the mascot and the reel music.
- The policies are AI-assisted drafts until a lawyer reviews them.

## Maintenance checklist (every 3–6 months, or when adding a tool, form or price)

- [ ] Prices in `site_settings`, print files and social posts all match.
- [ ] No new script, embed or tracker. If one is added, build the consent banner first and update `cookies.html`.
- [ ] New photos and videos: plates blurred, licenses noted in `MEDIA_LICENSES.md`.
- [ ] Every new form: unticked boxes, minimal fields, policy links.
- [ ] Re-run axe, the design inspector and the tests.
- [ ] Update the "last updated" date on any policy you change.
