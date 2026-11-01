# Letts Get Clean: 2026 cinematic upgrade plan

Written November 1, 2026. This plan answers Andrew's upgrade prompt plus the 11 TikTok and 6 Instagram references. Nothing has been changed yet; each phase is shown to Andrew before the next starts.

## What the site is today

- **Stack:** plain HTML, CSS and JavaScript. It's one `index.html` plus five policy pages, with no build step. It's hosted on GitHub Pages. Bookings, reviews and settings live in Supabase. LGC Pro (`app/`) is the owner's phone app.
- **Motion (live since 10-31):** GSAP 3.13 with ScrollTrigger and SplitText, plus Three.js r172, all self-hosted in `vendor/`. The pieces are a letter-by-letter name, soap-bubble foam over the hero film, the printing receipt, growing price tiles, rolling prices, a reel shutter and the footer name. Reduced motion turns all of it off.
- **Already there from the prompt:**
  - deep black background, one strong accent (rinse-water blue `#29C8FF`) and oversized Anton type with Inter for body text;
  - the hero film with the name over it, and the Book button;
  - the "How a detail goes" receipt;
  - the vehicle switch with live prices;
  - before-and-after sliders, the reels and real reviews;
  - the booking form: service, package, size, extras, home or drop-off, town, open times only, the outlet-and-hose box, the terms box, a honeypot and a live quote;
  - two-car and military deals;
  - payment rows with Cash App `$AndrewLetta` and Venmo `@Andrew-Letts-9`;
  - the towns list, the FAQ and the business schema;
  - privacy, terms, refund, cookies and accessibility pages, and the consent panel.
- **Facts check:**
  - The hours match: weekday slots start 3:00 PM, weekend slots 1:30 PM.
  - The prices match: launch $25 / $30 / $50, regular $35 / $40 / $70.
  - The automatic switch on Nov 17 already exists. LGC Pro's settings hold the deal end date, and `DEFAULTS` in `index.html` is the backup copy. Prices are kept in one place, which Andrew edits from his phone.
  - The drop-off address is never posted.

## The references, and what each one is

| Reference | What it shows | Where it lands |
|---|---|---|
| weblove "cinematic websites" | Cut-out photo layers, parallax, masks, fades ("FIND" hero) | Phase 2: hero |
| weblove "brune" flavours | Each product section repaints the whole page; products float | Phase 2: package colours, floating gear |
| webdialt sauce jar | 3D product hero with reflections and particles, bold type, textured backgrounds | Phase 2: 3D centrepiece |
| samanastudio | Cans floating in an arc under stage light | Phase 2: floating gear |
| wearebrand.io (3) | Liquid and 3D product sites, sensory scroll storytelling | Overall direction |
| ahmed_codes portfolio | GSAP + Lenis smooth scrolling, big type | Lenis decision |
| millee.md "20 things" | The launch checklist | Phase 3 |
| byjackprice, codevibes | Make AI sites look designed: references first, no "slop" | How we work (design-taste inspector) |
| Instagram: 30 Claude plugins | Tools for Claude; the design ones are UI UX Pro Max, Impeccable, Marketing Skills and Humanizer | A separate session to vet and install them (Andrew's call) |
| Instagram: paid vs free AI tools | Free image, video and voice tools that need Andrew's own accounts | Social content. The site keeps using only Andrew's real footage |
| Instagram: "Giving Claude eyes" (benkimball.ai) | A small camera Claude can see through | Not a website feature. It fits Mr. Jackson's pending webcam idea |
| Instagram: 9 free GitHub swaps (heysansser) | Open Higgsfield, VoiceStudio, OpenSEO, AppFlowy, OpenWhispr, OpenProject, Cal.com, Chatwoot, Cap | For the site: the existing seo-audit skill covers SEO, so OpenSEO isn't needed. The site already has its own booking (so no Cal.com) and adds no chat widget (Chatwoot needs a server and a consent category). Open Higgsfield could replace the pending Higgsfield account |
| Instagram: 5 free GitHub repos (nocodealex) | free-for-dev, public-apis, Scrapling, Ollama, awesome-mcp-servers | free-for-dev helps pick free tiers (Cloudflare analytics, an email service). Ollama can run local AI on this PC (Mr. Jackson). Not used: Scrapling, whose selling point is getting past Cloudflare's bot checks |
| Instagram: FreeLLM API (ashutoshwithclaude) | One local key that pools the free tiers of 30+ AI companies | Already installed on this PC (the `free-llm-apis` skill, 10-28). Not a website change |

## Phase 1: visual direction ("Showroom after dark")

The site already has the base the prompt asks for (black, one accent, oversized display type). Phase 1 evolves it rather than starting over, so the business cards, magnets and flyers still match.

- **Idea:** a detailing bay at night. Black paint under one strip light, where water beads catch the light. Everything glossy is earned by light, not by gradients.
- **Accent:** keep rinse-water blue `#29C8FF`. It's the colour of clean water and foam highlights, it reads 10:1 on black, and it's already printed on the business cards, magnets and flyers. Changing it would make the print run off-brand.
- **"Wet paint" finish:**
  - a slow specular sheen sweeps across big headings and the Book button, like light moving over a clear coat;
  - a fine grain texture and a soft strip-light glow sit on the dark sections, so nothing is flat black;
  - no purple, no blob gradients.
- **Type:** Anton stays the display face and gets larger. Inter stays the body face.
- **Package palettes for the colour melt (all pass AA):**
  - Exterior is "rinse": deep blue-black with blue ink.
  - Interior is "leather": dark cognac with a warm sand ink.
  - Full Detail is "showroom": bright gloss white with black ink. It's the finale.
- **What it avoids:**
  - identical rounded cards, icon grids and stock photos;
  - other brands' logos (any detailing bottles with labels get photographed label-away or blurred);
  - fake reviews or stats.

## Phase 2: signature features (with my recommendations)

1. **Cinematic hero.**
   - "LETTS GET CLEAN" becomes a mask over one of Andrew's own foam or water clips.
   - On scroll, the letters grow until the film fills the screen, then the page moves on.
   - The parallax layers are a cut-out of his white Sonata (from his own photo), the existing Three.js bubbles in front, and a soft foam layer.
   - One button: Book now.
2. **3D centrepiece:** a giant glossy soap bubble or water droplet. It refracts the film, has rim light and floating mist, and follows the mouse and scroll.
   - Recommended over a car or a spray bottle: those need a licensed 3D model (heavier, and not his work).
   - Phones and reduced motion get a still frame.
3. **Floating gear:** needs Andrew's real gear. Take one photo of each item (spray bottles, towels, brushes, foam cannon) on a plain wall, labels turned away; I cut them out.
   - The motion is CSS and GSAP only: small items blurred and slow, big ones sharp and fast. No WebGL.
4. **Colour per package:** three full-screen package sections with their own ids and palettes, using the exact `data-package` and IntersectionObserver method from the prompt. The bar-chart tiles retire.
5. **Package builder:** recommended as an upgrade of the booking form's first step, not a second form. Tap a package, see what's included and the live price (launch deal applied), watch the visual change, then "Book this package" moves to the day and time. One flow, nothing to keep in sync.
6. **Before and after:**
   - the drag sliders stay;
   - the reels change to muted autoplay when they scroll into view, with tap for sound;
   - a drop folder `assets/before-after/` gets a short README for new clips.
7. **Booking form:** already does almost everything listed. To add:
   - an optional email field (optional so it collects only what's needed);
   - Mama Letts on the confirmation;
   - a rate limit (at most 3 bookings per phone number per day, enforced by the database).
   - Submissions keep going to Supabase, so they show in LGC Pro with an iPhone alert. No form service is needed.
8. **Polish:**
   - hover micro-interactions;
   - "How it works" becomes the receipt's three headings: Book → I come to you → Shine;
   - Mama Letts in the footer sign-off and on the 404 page.
   - Recommended against a preloader: on a fast site it only makes people wait. Mama Letts shows on the confirmation and the 404 instead.
   - The header Book button already stays on screen on phones.

Also: payment, service area and FAQ sections exist. The FAQ gets "How long does it take?". Reviews stay real, with no placeholders.

## Phase 3: the 20-point launch checklist (audited November 1, on the live site)

| # | Item | Status | Action |
|---|---|---|---|
| 1 | Privacy policy | ✅ | None |
| 2 | Terms | ✅ | None |
| 3 | No secrets in the frontend | ✅ | The Supabase key in the page is the public one, made to be there; the database rules protect the data |
| 4 | HTTPS | ✅ | github.io always serves HTTPS |
| 5 | Cookie consent | ⚠ | Works, but on phones it sometimes pops in after the page draws and shoves everything down (layout shift 0.47 in 1 of 3 Lighthouse runs). Fix: decide before the first paint |
| 6 | Meta titles and descriptions | ✅ | Add "Newburgh car detailing" wording |
| 7 | Social preview | ⚠ | Home page only. Add it to the policy pages |
| 8 | Favicon and icons | ✅ | Add 192 and 512 icons |
| 9 | sitemap.xml and robots.txt | ❌ | Add both |
| 10 | Alt text | ✅ | None |
| 11 | Compression | ⚠ | Reels are 8–16 MB each. Re-encode (about 70% smaller) and add phone-sized images (Lighthouse: 237 KB to save) |
| 12 | Lighthouse | ⚠ | Desktop 100 / 100 / 100 / 100. Phone 93–97 performance (100 / 100 / 100 for the rest) when the cookie panel doesn't shift, 74–79 when it does. Goal: phone 90+ every run |
| 13 | Contrast | ✅ | axe: 0 issues |
| 14 | Mobile | ✅ | Tested at 390, 768 and desktop. Will re-test at 375 |
| 15 | Custom 404 | ❌ | Add, starring Mama Letts |
| 16 | Broken links | ✅ | All links work. "Cookie settings" gets a no-JavaScript fallback |
| 17 | Form validation | ✅ | None |
| 18 | Spam protection | ⚠ | The honeypot works. Add the per-phone daily limit |
| 19 | Analytics | ❌ | None today, and the site promises no tracking. Andrew picks one |
| 20 | One CTA: Book now | ✅ | Every page has Book |
| + | LocalBusiness schema | ✅ | Add opening hours |

## Andrew's answers (November 1)

- **Direction:** yes. Keep the blue and evolve into "Showroom after dark". Phase 1 is approved.
- **Analytics:** Cloudflare Web Analytics (free, no cookies). Andrew makes the free Cloudflare account and adds the site; the beacon token it gives is public, not a secret. The privacy policy, cookie page and consent text get updated to match.
- **Bookings:** keep them going to Supabase, LGC Pro and the iPhone alerts.
- **3D centrepiece:** a giant soap bubble or water droplet, built in code.
- **Stack:** stays plain HTML, CSS and JavaScript (the prompt's own rule). The React component libraries (Aceternity, Magic UI, shadcn, React Three Fiber) need React, Tailwind and a build step, so their effects are recreated with GSAP and Three.js instead. Lenis is added for smooth scrolling and is turned off with reduced motion.

## Phase 2 status (November 1, live since November 1 at `af47073`)

Built and checked:
- the hero name as a window over the film, growing away on scroll;
- the lens droplet and foam;
- Lenis smooth scrolling;
- the three package sections with the colour melt, and the vehicle switch rolling the prices;
- the package builder in the booking form;
- reels that play in view with tap for sound, and the `assets/before-after/` drop folder;
- the optional email field;
- the daily limit of 4 bookings per phone number;
- Mama Letts on the confirmation and in the footer;
- "1 · Book, 2 · We come to you, 3 · Shine" on the receipt;
- the "How long does a detail take?" FAQ answer;
- button light sweeps and film grain.

The reels and hero film were also re-encoded (42.5 MB down to 18.5 MB), which pulled Phase 3 item 11 forward.

Checks:
- axe: 0 issues with motion on and off.
- Lighthouse: accessibility, best practices and SEO all 100; desktop performance 99.
- The design inspector shows no failures at desktop width.
- All booking, consent and cookie checks pass.
- 103 of 103 database tests pass.

Not done yet:
- **Floating gear:** waiting for Andrew's gear photos.
- **The database update** `20261101_booking_email_limit.sql` (email column and daily limit) is tested but not applied. It goes live only with Andrew's OK. Until then the site saves bookings without the email.
- **The FAQ answer** uses the booking slot length (2 hours). Andrew should confirm how long each package really takes.

## Phase 3 status (November 1, live since November 1 at `af47073`)

| # | Item | Now |
|---|---|---|
| 5 | Cookie consent | ✅ Decided in `<head>` before the first paint, so the phone panel is in place from the start. Layout shift 0 in every run (3 throttled phone loads, 3 Lighthouse runs) |
| 6 | Meta | ✅ Title "Mobile Car Detailing in Newburgh, NY · Letts Get Clean"; description 151 characters, Newburgh and Orange County |
| 7 | Social preview | ✅ All five policy pages now have their own preview card |
| 8 | Icons | ✅ 192 and 512 icons and `site.webmanifest` on every page |
| 9 | Sitemap and robots | ✅ `sitemap.xml` and `robots.txt`. robots.txt is ignored until the site has its own domain (see README), so the sitemap goes to Search Console |
| 11 | Compression | ✅ Photos at 480/720/900 wide, a 40 KB phone hero instead of 129 KB, reel posters wait until near. Phone first load 606 KB to 313 KB |
| 12 | Lighthouse | ✅ Live site: phone 98, 97, 97 (three runs); desktop 100. Accessibility, best practices, SEO 100 on both |
| 14 | Mobile | ✅ Re-tested at 375, 768 and 1440: no sideways scroll, axe 0 |
| 15 | Custom 404 | ✅ `404.html` with Mama Letts, Book, Home and Prices; tested two folders deep |
| 16 | Broken links | ✅ "Cookie settings" now points at `cookies.html#settings`, so it works with JavaScript off; the cookie page says so when JavaScript is off |
| 18 | Spam protection | ⏳ The daily limit is built and tested; the database update needs Andrew's OK |
| 19 | Analytics | ⏳ Waiting for Andrew's Cloudflare token and one choice (below) |
| + | Schema | ✅ Open hours (weekdays 3 to 7 PM, weekends 1:30 to 7:30 PM, from the booking times) and a WebSite entry for the site name |

The FAQ structured data stays: Google stopped showing FAQ rich results in May 2026, but it still describes the visible FAQ to other search and AI tools.

### Cloudflare Web Analytics, when the token arrives

1. Andrew: dash.cloudflare.com, free account, Analytics & Logs, Web Analytics, Add a site, hostname `andrew110927.github.io`. Copy the token from the snippet (it's public, it goes in the page).
2. Andrew picks: count every visit unless the visitor says no (Reject all, or a browser privacy signal), or count only visitors who tap Accept.
3. Then: load the beacon from `static.cloudflareinsights.com` only when allowed, add it to the page's security policy, add an Analytics line to the cookie panel and cookie page, and update the privacy policy, cookie policy and consent text (they say "no analytics" today). Visitors who already chose get asked again, because the promise changed.

### Infiniti reel (November 1, live at `ae1be41`)

Andrew's Infiniti interior before/after reel (`media/reel4_web.mp4`, 0:35, no audio) took the reels band's second panel, which had repeated the Sonata photo. Checked frame by frame: no plates, faces or addresses.

### Google Search Console

Andrew adds a "URL prefix" property for `https://andrew110927.github.io/letts-get-clean/`, picks the HTML tag method, and sends the tag (public). Once it's on the live page he clicks Verify and submits `sitemap.xml`.

## Things Andrew still decides or supplies



- One foam or water clip for the hero mask (any of his footage with foam on paint).
- Gear photos for the floating section.
- The Cloudflare token and the counting choice (above).
- The Search Console tag (above).
- OK to apply the database update (email column and daily limit).
- Real detail times per package, for the FAQ.
- Optional: installing the website plugins from the plugin reel (vetted first, in a separate session).

## Phase 4: the wash (November 1, 2026, branch `site-3d`, not live)

Andrew asked for an immersive 3D scroll experience with a car that goes from dirty to clean. Built as `js/wash.js` on the existing stack (plain HTML, self-hosted Three.js, GSAP, Lenis): the package section is now a sticky stage with a drawn white sedan behind the three package screens, washed by scroll. Deliberately not done from his prompt, with the reason: a downloaded CC0 car model (somebody else's car and a big download; the drawn one is 0 bytes extra and reads as the Sonata), glass cards, gradient borders and a custom cursor (the design study's markers of a template), a blocking preloader (it would delay the first paint; the stage shows its own 0–100% counter instead), a services marquee (decoration), a drawn county map (an inaccurate map is worse than the town list). Added: a ticking launch-deal badge, stars that pop in on the reviews letter, Mama Letts tilts her head on hover. Stills for reduced motion and no-WebGL: `media/wash_still.webp` and `wash_still-tall.webp`, rendered headlessly from the same code.

Later on November 1 Andrew rejected the drawn car (boxy) and asked for a real one. The truly photoreal free models all need a sign-in to download, so the site now loads `media/car.glb`, the CC0 "Electric Car" from grab3d.com (1.2 MB, 17,770 triangles), turned, scaled, grounded and repainted white by hue in the paint shader; glass, trim and the red tail light keep the model's own look. Any other glTF car dropped in as `media/car.glb` works the same way (set `CAR_FRONT` in `js/wash.js` if its nose points the other way). The drawn car remains as the stand-in while the model downloads.
