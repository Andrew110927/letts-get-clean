# Letts Get Clean: compliance and redesign report

Branch `site-policies` (cut from live `main` ee38355). Written October 31, 2026. **Live since October 31, 2026**, with Andrew's OK: the privacy migration was applied to the live database, then the branch was published to `main`.

## What changed, by area

| # | Area | Status | What was done (files) |
|---|---|---|---|
| 1 | Privacy policy | ✅ | `privacy.html`: what's collected and how, uses, sharing (Supabase, GitHub Pages, Stripe when paying by card), retention, security and breach notice, rights, the privacy request steps (`#request`), children, changes |
| 2 | Terms of service | ✅ | `terms.html`: booking, prices and payment, cancelling, what we need from you, the condition check and existing damage, photos of the work, reviews, site use and IP, liability limits, New York law, Orange County courts |
| 3 | Refund and cancellation | ✅ | `refund-policy.html`: no deposit, free cancelling, weather, if you're not happy, when and how refunds happen, card holds |
| 4 | Cookie policy | ✅ | `cookies.html`: no cookies; table of the two browser-storage items; working "Clear my saved details" and "Forget the QR code tag" buttons (`#settings`) |
| 5 | Consent banner | ✅ | A small "Your choice" panel (`index.html`) with **Accept all** and **Reject all** at the same size and style, plus **Customize** with per-category switches: Strictly necessary is always on and labelled; Preferences covers remembered booking details and the QR code tag; analytics and marketing aren't used. Nothing optional is stored until someone says yes, and the code checks the choice before every optional write. The choice lasts 12 months. A Global Privacy Control signal counts as Reject, with no panel. "Cookie settings" in every footer reopens it, and `cookies.html#settings` manages the same choice. The panel sits over the hero film and scrolls away, so it never covers the name or the content, and it doesn't trap focus |
| 6 | Form consents | ✅ | `index.html`: required unticked terms box with links; text-message notice under the phone field; privacy link under the Book button; "Remember my details" unticked by default; required fields marked visibly (*) and in code. Each booking sends the terms version; the database stamps the time with its own clock (`20261031_privacy.sql`, applied live 10-31). If the column were ever missing, the site saves the booking without it |
| 7 | Collect only needed data | ✅ | "How did you hear about us?" is optional. Everything else is needed for a mobile job |
| 8 | Third parties and security | ✅ | Fonts self-hosted (`fonts/`); a CSP and referrer policy `<meta>` on every page; `noreferrer` on links that open new tabs. No npm packages ship. *GitHub Pages can't send nosniff or Permissions-Policy headers: remaining risk* |
| 9 | Dark patterns | ✅ | The pre-ticked box is gone; the "(5 stars)" pre-fill on texted reviews is gone; the countdown tied to the real end date became a plain end date |
| 10 | Hidden fees | ✅ | Every price, size surcharge and extra is on one list; "Reg. $35" is now "$35 after Nov 16"; the vehicle switch shows the true total per size; terms say Andrew asks before adding anything |
| 11 | Reviews | ✅ | "Every honest review gets posted, good or bad" is on the site, plus the moderation rule in the terms. Ann is a real customer (Andrew, 10-31). Keep approving negative reviews too |
| 12 | Claims | ✅ | Nothing unsupported was found; copy kept modest. *Confirm every exterior gets the foam pre-wash* |
| 13 | Alt text and captions | ✅ | All images described; the stars are drawn with one text label; the reels have written descriptions. Checked 10-31: the Sonata reel is music with no talking (caption track `media/reel_web.vtt` says so); the Outback reel's audio is silent |
| 14 | Contrast | ✅ | Field edges now 3.6:1 (were about 1.2:1); the footer's blue is now 3.8:1. axe: 0 contrast issues |
| 15 | Keyboard | ✅ | Skip link, visible focus, the calendar as a wrapping grid, labelled controls, menu focus and Esc. The scrolling ticker (which couldn't be paused) was removed |
| 16 | Business details | ✅ | Footer: name, owner, town, phone, text, socials, every policy link, Cookie settings, Privacy request; hours in the contact rows; schema unchanged (public details only); `accessibility.html` |
| 17 | Age and kids | ✅ | Any age welcome. Under 13 needs a parent or guardian to book (FAQ, terms, privacy). Minors' data is limited to what the job needs |
| 18 | Unsubscribe | ✅ N/A | No email list. Texts: "Text STOP any time" is on the form and in the policies |
| 19 | Media licenses | ✅ | `MEDIA_LICENSES.md`. Every file is accounted for: the mascot is Andrew's own art of his dog; the Sonata reel's music was made for the business by Claude; the other reels are silent (Andrew, 10-31). *Only the hero film is still "presumably own footage"* |
| 20 | Data deletion | ✅ | Privacy request steps on `privacy.html#request`, the checklist `DATA_REQUESTS.md`, and **Forget this customer** in LGC Pro (app 1.8.0, cache lgcpro-v15) calling `forget_customer()`. It blanks the details everywhere and keeps every money total. Covered by three new database tests (99 of 99 pass). Live since 10-31 |

## The new design (the "make it 1000000 times better" phase)

- **Direction:** *the name as a monument*, dealt by design-taste-frontend (seed 1429003636). Two section layouts were swapped because the dealt ones couldn't hold the real content: pricing became "plans that step up" (three packages, not one plan), and the review became "one long letter" (Ann's review is 21 words). `DESIGN.md` has the full system.
- **Idea:** "Letts Get Clean" reads as "let's get clean", so the name is set across the bottom of the real driveway film and returns cropped in the footer under "Ready for a clean car?".
- **Live thing:** the vehicle switch re-prices all three tiles and carries the choice into the booking form.
- **Kept, unchanged in behaviour:** booking with live open times, two-car booking, military and holiday discounts, the house wash whole-day rule, the waitlist, QR `?src=` tags, booking alerts, the review form, FAQ structured data.
- **Pictures:** only Letts Get Clean's own photos and footage. Nothing found or stock.

## The motion phase ("way better and cooler", October 31; live since October 31 at main bbb53f7, with Andrew's OK)

Built with the newly added skills: gsap-scrolltrigger, motion-design, threejs-performance, plus design-taste-frontend's inspector and the agent-skills ADR format. Every scene is listed in `DESIGN.md` section 6; the library choice is in `docs/adr/0001-gsap-and-threejs.md`.

- **What's new:**
  - the name rises letter by letter (wide screens);
  - iridescent soap bubbles over the hero film that lean away from the pointer and pop on click (wide screens);
  - the receipt prints out of a printer's mouth in 12 steps;
  - the price tiles grow like a bar chart while the prices count up, and the vehicle switch rolls them to the new amount;
  - the rate rows cascade in; the reels open like a shutter;
  - the footer name rises as the page ends;
  - the Book buttons lean toward a mouse.
- **Compliance:**
  - Both libraries are self-hosted in `vendor/`, so the CSP is unchanged and there are no new third parties, cookies or storage. Nothing needs a consent category.
  - Licenses are in `MEDIA_LICENSES.md` (GSAP Standard no-charge license; Three.js MIT).
  - With reduced motion nothing extra loads. The foam is hidden from screen readers. The split heading keeps its name ("Letts Get Clean").
- **Checks (10-31):**
  - axe 0 violations with motion on (1440 and 390) and off (all six pages, 1440 and 390).
  - Lighthouse: desktop 99 / 100 / 100 / 100 (performance, accessibility, best practices, SEO); phone 85 / 100 / 100 / 100. The phone score is within the run-to-run range of the live version (66–86) on the uncompressed local server. A throttled phone shows the same largest paint as before, the hero sentence at about 0.65 s.
  - Playwright:
    - booking dry run reaches the confirmation;
    - the terms version is sent, and the old-database fallback still works;
    - SUV re-prices to $35, $40 and $60, and back to $25, $30 and $50;
    - every consent and cookie check above still passes;
    - jumping straight to `#contact`, the bottom, or loading `#book` still reveals every section;
    - 33 clicks and sweeps across the hero throw no errors.
  - Design inspector (with motion forced on): 2 FAIL, down from 3 FAIL + 1 WARN on the live version.
    - One FAIL is past the inspector's 11-screen limit.
    - The other is the tablet first visit, where the consent panel pushes the name just below the first screen until a choice is made (an existing trade-off from the phone consent fix).
  - Database tests: 99 of 99 pass.

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
- **Lighthouse 12.2.1:** Accessibility 100, Best Practices 100, SEO 100 on all six pages, with no failing audits after letting the visible text name the calendar days and rate rows (label in name).
- **Consent checks (Playwright, fresh browser profiles):**
  - First visit stores nothing optional.
  - The tab order is skip link, then Accept all, then Reject all, and both buttons measure 194 × 50 with the same colour and weight.
  - Reject moves focus to the main content and bookings then store nothing.
  - Accept keeps the details and the QR tag.
  - The footer link reopens the switches; turning Preferences off clears what was saved; the cookie page shows the same choice.
  - A GPC browser gets no panel and a stored "reject".
- **Tests:** `node --test "tests/*.test.mjs"`: 99 of 99 pass, including the new privacy tests (terms timed by the database; only the owner can forget; forgetting keeps every money total).
- **Playwright, round 2:**
  - A booking against a database that already has the terms column sends version 2026-10-31.
  - Against one that doesn't, the first try is refused and the retry without the column saves the booking.
  - In LGC Pro demo mode, "Forget this customer" shows its warning, needs two taps, and removes the client from the list. No errors.

## What Andrew needs to do (outside the code)

**Answered by Andrew on 10-31 and now in the site:**
- The business is owned and run by Andrew Letts (no LLC).
- Email andrew.letts@icloud.com: added to the footer, the about section, the business schema and every policy page, plus email privacy requests.
- **No satisfaction guarantee:** the refund policy keeps "look the work over before you pay, and Andrew fixes anything missed right then".
- Prices really do rise to $35 / $40 / $70 after Nov 16, and again in summer. Update `site_settings` and the print files when that happens.
- The mascot is Andrew's own art of his dog; the Sonata reel's music was made for the business.
- Ann is a real customer.

**Still to do:**
1. **Confirm the defaults written into the policies:**
   - refund replies within 2 days, refunds sent within 7
   - records kept up to 7 years
   - before and after photos with plates blurred and no faces or addresses
   - the condition-check wording
2. **Have a lawyer review** the policy pages, especially the sections listed below.
3. **Check whether you need an assumed name certificate.** In New York, someone doing business under a name other than their own ("Letts Get Clean" instead of "Andrew Letts") generally has to file one with the county clerk. It's cheap and quick; ask the Orange County Clerk.
4. Optional: an OpenRouter key for the image skills (see `design/image-prompts.md`).

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
- [ ] No new script, embed or tracker. If one is added, give it a category in the consent panel, keep it off until allowed, and add it to the table in `cookies.html`.
- [ ] New photos and videos: plates blurred, licenses noted in `MEDIA_LICENSES.md`.
- [ ] Every new form: unticked boxes, minimal fields, policy links.
- [ ] Re-run axe, the design inspector and the tests.
- [ ] Update the "last updated" date on any policy you change.
