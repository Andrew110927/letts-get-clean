# Letts Get Clean: compliance audit (Phase 1)

Audited October 31, 2026, against the 20-point website-compliance standard.
- **What was checked:** the live site (https://andrew110927.github.io/letts-get-clean/, identical to `origin/main` ee38355) and its Supabase database rules.
- **How:** read the code, loaded the live site in a browser (network, storage and cookies), ran axe-core 4.10, and checked colors by hand.
- **No site code was changed.** The owner app (`app/`) sits behind a login and was only checked for data deletion.

## Site profile

| Field | Value | Source |
|---|---|---|
| Business legal name | **❓ Letts Get Clean or Letts Detailing?** Sole proprietor, DBA or LLC? | Ask Andrew |
| Owner | Andrew Letts | Site |
| Business type | Mobile car, bike and trash can cleaning, plus house pressure washing | Site |
| Service area | Orange County, NY (Newburgh, New Windsor, Middletown, Goshen, Warwick, Monroe) | Site |
| Public email | **❓ None on the site** | Ask Andrew |
| Public phone | (845) 282-9387 | Site |
| Physical address | PRIVATE: drop-off address sent by text after booking | Site (already handled correctly) |
| Website | https://andrew110927.github.io/letts-get-clean/ | |
| Tech stack | Plain HTML/CSS/JS on GitHub Pages, with a Supabase database | Code |
| Data collected | Booking: name, phone, street address and town, car make/model, notes, how you heard, outlet/hose box, military box. Review: stars, first name (optional), text | Code |
| Payments | Paid in person after the job: cash, Cash App, Venmo. Stripe card holds are built (branch `site-features`) but not live | Code |
| Third-party tools | Google Fonts, Supabase, GitHub Pages. No analytics, pixels, embeds or chat | Live network check |
| Email marketing | NO (no email is collected anywhere) | Code |
| Kids | **Any age can be a customer** (Andrew, 10-31). The site isn't aimed at kids | Andrew |
| Customers outside the US | NO (local service only) | Site |
| Prices | Launch prices until Nov 16: Exterior $25 (reg. $35), Interior $30 ($40), Full $50 ($70). SUV +$10, minivan +$15. Extras: freshener $2, extra-dirty interior $10, wax $20. Bike $20, trash can $15 each, house $300. 10% military (car), $5 off a second car | Live settings match the code defaults |
| Refund / cancellation | No deposit, pay after the job, free cancellation, rain means a new time, card holds are free to cancel. **❓ Satisfaction guarantee not decided** (question 18 in the spec) | Site + spec |
| Effective date | **❓** Suggest the day the pages go live | Ask Andrew |

## Summary

**Already good:**
- No tracking.
- The home address stays private.
- Prices are shown up front with the exact total in the quote.
- The launch deal has a real end date.
- Honest copy and an honest review count.
- Every image has alt text.
- Good focus rings and a working mobile menu (Esc closes it, focus returns).
- Reduced motion is respected.
- Customer data is locked away from the public: anonymous reads of `bookings` and `reviews` return permission denied.

**Biggest gaps:**
- No policy pages.
- No way to delete a customer's data.
- No privacy, terms or text-message wording on the booking form.
- A pre-checked box and a required "How did you hear about us?".
- Unknown licenses for the mascot and the reel soundtracks.
- A few accessibility fixes (skip link, ticker pause, field borders, captions).

| # | Area | Status | What I found | What needs to change | Priority | Effort |
|---|---|---|---|---|---|---|
| 1 | Privacy Policy | ❌ | None live. A draft `privacy.html` (written 10-31 before this audit, not committed) has no disclaimer comment, cookie or rights links, or effective date | Rewrite to the standard, link from the footer and form | High | S |
| 2 | Terms of Service | ❌ | None | Write: booking, customer prep, prices, payment, cancel, pre-existing damage (condition check and photos), photos of work, NY law | High | M |
| 3 | Refund & Cancellation | ❌ | Rules are scattered through the FAQ (pay after, free cancel, rain) | One page matching the FAQ and Terms. Needs your guarantee answer | High | S |
| 4 | Cookie Policy | ❌ | The site sets **no cookies**. Storage is one localStorage key, `lgc.contact.v1` (saved booking details), written only when "Remember my details" is on | Short page with a table: `lgc.contact.v1`, Preferences, kept until cleared; Google Fonts (until self-hosted) | High | S |
| 5 | Consent banner | ⚠️ Not needed today | Nothing non-essential loads: no analytics, pixels or embeds | **Recommendation:** self-host the fonts and skip the banner (a banner with nothing to refuse is just noise). Add a footer "Cookie settings" link to a panel that explains this and clears saved details. Build the real consent gate the day a tracker or embed is added. Your call: the standard's checklist asks for a banner | Med | S |
| 6 | Form consents | ❌ | "Remember my details" is **pre-checked**. No Terms or Privacy links near "Book this detail". No wording that Andrew will text the number. No consent record | Untick it by default. Add a required unchecked "I agree to the Terms and Refund Policy" box with links. Add a text-message line ("Andrew texts this number about your booking. Msg & data rates may apply. Text STOP anytime"). Store the version and time agreed on the booking (needs a small database change, with your OK) | High | M |
| 7 | Collect only needed data | ⚠️ | "How did you hear about us?" is **required**. The rest is needed for a mobile job (the address shows where to go). No form data goes into URLs or logs. The `sms:` link to Andrew carries the booking details, but it opens the customer's own Messages app | Make "How did you hear" optional (it still helps track flyers and QR codes) | High | S |
| 8 | Third-party scripts | ⚠️ | See the inventory below. External links have `noopener` but no `noreferrer`. GitHub Pages sends HSTS only: no CSP, Referrer-Policy, nosniff or Permissions-Policy. No `package.json` is shipped, so there's nothing to `npm audit` (the test tools aren't on the site) | Self-host Anton and Inter (the only third party on page load). Add `noreferrer`. Add a `<meta>` CSP and a Referrer-Policy. nosniff and Permissions-Policy can't be set on GitHub Pages without a proxy such as Cloudflare: noted as a remaining risk | Med | S |
| 9 | Dark patterns | ⚠️ | The pre-checked box (#6). The "Text my review" button pre-fills **"(5 stars)"**, which nudges the rating. The countdown ("17 days left") is real, from the deal end date | Untick the box. Remove "(5 stars)" from the review text. Keep the countdown only while the deal truly ends Nov 16 (no rolling extensions) | High | S |
| 10 | Hidden fees | ⚠️ | Every price, surcharge and extra is shown next to the price, and the quote shows the exact total. Prices sit in one place (`DEFAULTS`, overridden by `site_settings`) ✅. **"Reg. $35/$40/$70" is a regular price that hasn't been charged yet**. That's OK as an introductory offer only if prices really rise to those amounts on Nov 17 | Reword to "Launch price · goes to $35 on Nov 17". Terms: Andrew asks before adding "extra-dirty interior" on site, never adds it silently. Print and social prices come from the same `DEFAULTS` ✅. Ads and posts outside the repo still need checking | Med | S |
| 11 | Reviews | ⚠️ | 1 approved review: **Ann, 5★** ("right on time… did two vehicles…"). Reviews show only after Andrew approves them, so choosing only the good ones would mislead (FTC review rule) | Confirm Ann is a real customer. Approve every genuine review, good or bad. Remove only spam, abuse or personal info, and say that on the site. Link the Google profile once it exists. Don't offer discounts for reviews unless disclosed | Med | S |
| 12 | Unsupported claims | ✅ mostly | Claims found are listed below. All are modest or provable | Confirm the foam bath claim is how you work. Nothing else to change | Low | XS |
| 13 | Alt text and captions | ⚠️ | All images have alt text (2 decorative with `alt=""`) ✅. **Reels 1 (Sonata) and 2 (Outback) have sound tracks and no captions.** Reel 3 and the hero loop are silent | If the reels have talking, add captions (`.vtt`). If music only, add a one-line text description. Give the star `div`s `role="img"` (axe flag) | Med | S |
| 14 | Contrast | ⚠️ | All text passes (dim 8.95:1, muted 6.30:1, accent 10.3:1, ink on accent 9.7:1). axe's 11 errors on the "best value" card are false alarms (real background is #29C8FF, 9.7:1). **Form field borders are about 1.2:1** (#262C36 on #181C24; needs 3:1) | Lighten the field and choice borders to about #6B7584 (≥3:1). The focus color stays the same | Med | XS |
| 15 | Keyboard | ⚠️ | Focus rings ✅. Menu focus and Esc ✅. Real buttons ✅. One h1, headings in order ✅. `lang` ✅. Reduced motion ✅. **No skip link.** **The scrolling ticker can't be paused** (moves more than 5 s; WCAG 2.2.2). Required fields not marked. axe: one small "Book Interior" button flagged for target size | Add "Skip to main content". Pause the ticker on hover and focus, plus a pause button. Mark required fields. Fix the button spacing | Med | S |
| 16 | Business details | ⚠️ | Footer: name, phone, text, town ✅. Payment methods and hours are on the page ✅. Schema `AutoWash` with public details only ✅. No email, no policy links, no accessibility statement | Add policy, Cookie settings and Accessibility links to the footer. Add hours to the footer. Write `/accessibility`. Add an email if you want one | Med | S |
| 17 | Age / kids | ⚠️ | Any age welcome (your call). Taking an under-13's name, phone and address through the form would bring in **COPPA**. NY's Child Data Protection Act means collecting only what's needed from under-18s | Say: "Customers of any age are welcome. If you're under 13, a parent or guardian needs to book." Booking data counts as strictly needed, so nothing extra from minors and no ads. No 18+ checkbox | High | XS |
| 18 | Unsubscribe | ✅ N/A | No marketing email. Texts are one-to-one from Andrew | Policy line: "text STOP and Andrew stops". Revisit if a text opt-in or email list is ever added (the spec mentions one) | Low | XS |
| 19 | Media licenses | ⚠️ | See the media list below. **Unknown:** where the mascot came from, and **the soundtracks on reels 1 and 2**. Music from TikTok or CapCut libraries usually isn't licensed for websites | Confirm both. Swap any unlicensed music for silent versions or royalty-free tracks. Write `MEDIA_LICENSES.md` | High | S |
| 20 | Data deletion | ❌ | No request process, and **the owner app never deletes customers** ("only archived", `app/app.js:321`). Invoices and payments link to customers | Add a "Privacy request" section (pre-filled text to Andrew; ID check is that it must come from the number on file). Add an owner-only "Forget this customer" action that blanks name, phone, address and notes on the customer, vehicles and bookings while keeping amounts and dates for taxes. Write `DATA_REQUESTS.md`. Needs a database change (with your OK) | High | M |

## Third-party inventory (#8)

| Name | Purpose | Data it receives | Cookies | Category | Still needed? |
|---|---|---|---|---|---|
| GitHub Pages | Hosts the site | IP address, browser (server logs) | No | Strictly necessary | Yes |
| Supabase (`fisenrazdvnobzjpihti.supabase.co`) | Prices and settings, open times (`busy_slots`), approved reviews, saving bookings and reviews | What's typed into the booking or review form, plus IP address | No | Strictly necessary | Yes |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Anton and Inter fonts | IP address, browser | No | Functional (third party) | **Replace with self-hosted files** |
| `app/discounts.js` | Discount rules (same site) | None | No | Strictly necessary | Yes |
| Links out: Cash App, Venmo, Instagram, TikTok | Payment and social links (`target=_blank rel=noopener`) | Nothing until clicked | No (not embedded) | n/a | Yes; add `noreferrer` |
| Stripe (branch `site-features`, not live) | Card holds | Card (typed on Stripe's page), amount | On Stripe's page only | Strictly necessary when used | When card payments launch |

The owner app only (behind login) uses Supabase auth, jsPDF 3.0.3 and qrcode-generator 1.4.4 from jsDelivr with SRI, and Web Push. Not public-facing.

## Claims found (#12)

| Claim | Where | Verdict |
|---|---|---|
| "Mama Letts approved" | Mascot, logo, share image | Brand slogan, obviously playful: keep |
| "Windows & mirrors streak-free" | Exterior package | Normal service description: keep |
| "Biggest savings" / "Best value · save $20" | Full Detail | True by the prices ($20 off vs $10 each): keep |
| "Foam bath to lift dirt before anything touches the paint" | Reels section | Keep **if** every exterior gets a foam pre-wash. Please confirm |
| "Hand washed… not a drive-through brush" | About | True: keep |
| "Reg. $35 / $40 / $70" | Packages | See #10: reword as "goes to $X on Nov 17" |
| "Letts Get Clean is brand new" | Reviews (empty state) | Honest: keep |

None of these appear on the site: "best in town", "#1", "insured", "licensed", "certified", "eco-friendly", "guaranteed" or "100%". ✅

## Reviews found (#11)

| Reviewer | Stars | Date | Status |
|---|---|---|---|
| Ann | 5 | Oct 25, 2026 | Approved and showing. **Confirm she's a real customer** (she mentions two vehicles) |

## Media (#19)

| File(s) | What it is | Source | License status |
|---|---|---|---|
| `ext_before/after`, `int_before/after` (.webp) | Sonata before and after | Andrew's own work (plates blurred) | ✅ Own |
| `reel_web.mp4` + poster | Sonata reveal, 0:28, **has audio** | Own footage | ⚠️ **Soundtrack unknown** |
| `reel2_web.mp4` + poster | Outback inside and out, 0:43, **has audio** | Own footage | ⚠️ **Soundtrack unknown** |
| `reel3_web.mp4` + poster | Silverado interior and wheels, 0:26, silent | Own footage | ✅ Own |
| `hero_loop.mp4`, `hero_poster.jpg/.webp` | Hero background, silent | Presumably own footage | ❓ Confirm |
| `mascot.webp`, `mascot-160.webp`, `mascot-lockup.webp`, `og-card.jpg`, `favicon-64.png`, `icon-180.png` | Cartoon dog mascot and logo | **❓ Who made it?** (drawn, commissioned or AI) | ❓ Confirm you own the rights. If it's AI-made, check the tool's terms |
| Inline SVG icons | Cash, home, pin, check, etc. | Hand-drawn paths in `index.html` | ✅ (if copied from Lucide or Feather: ISC/MIT, no attribution needed) |
| Anton, Inter | Fonts | Google Fonts | ✅ SIL Open Font License (allows self-hosting) |
| `print/` | Cards, magnets, flyers, yard sign | Built from the mascot and site photos | Same as the mascot |

## Questions for Andrew before Phase 2

1. **Legal name:** "Letts Get Clean" or "Letts Detailing"? Are you a sole proprietor, a registered DBA or an LLC?
2. **Email:** put one on the site for privacy requests, or keep phone and text only?
3. **Satisfaction guarantee:** for example "text a photo within 24 hours and I'll come back and fix it free", 48 hours, or none?
4. **Launch prices:** will they really go to $35 / $40 / $70 on Nov 17?
5. **Mascot:** who made it? **Reels 1 and 2:** what's the sound (your voice, or a song from TikTok or CapCut)?
6. **Ann's review:** a real customer?
7. **Banner:** OK to skip the cookie banner (recommended, since nothing needs consent) and self-host the fonts?
8. **Database:** OK to add consent fields to bookings and a "forget this customer" function? Both change the live database, and I'd show them first.

## Phase 2 plan (after approval)

All work goes on branch `site-policies` (cut from live `main`), one commit per area. Nothing gets pushed live without your OK.

1. **Legal pages:** `privacy.html`, `terms.html`, `refund-policy.html`, `cookies.html`, `accessibility.html`, each with the AI-draft disclaimer comment and in the site's style.
2. **Form:** untick "Remember", make "How did you hear" optional, add the agree box and text-message line, mark required fields.
3. **Privacy request** section and the owner "forget customer" action, plus `DATA_REQUESTS.md`.
4. **Honesty fixes:** remove "(5 stars)", reword the launch prices, add the review policy line.
5. **Accessibility:** skip link, ticker pause, field borders, star roles, button spacing, reel captions or descriptions.
6. **Footer and the rest:** footer links and hours, self-hosted fonts, CSP and Referrer meta, `noreferrer`, `MEDIA_LICENSES.md`.
7. **Verify** (axe on every page, keyboard pass, network check, form test, 375px), then write `COMPLIANCE_REPORT.md`.
8. **Stripe branch:** `site-features` must merge these pages before card payments go live. The policies will already cover "if you pay by card online".
