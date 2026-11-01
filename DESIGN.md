# Letts Get Clean · design system

The site's design language, so every future change looks like the same site. The structure follows the awesome-design DESIGN.md format, with Tesla's automotive system as the reference for restraint: photography carries the page, one accent for actions, and a bar that turns solid on scroll. The identity is Letts Get Clean's own, kept from the print materials.

## 1. Direction and idea

- **Direction: the name as a monument** (design-taste-frontend, seed 1429003636). The business name is the headline, set across the bottom of the real driveway film. Everything after the first screen stays calm and small, so the contrast holds.
- **The idea:** "Letts Get Clean" reads as "let's get clean", so the name is the invitation. It opens the page over the film and returns cropped in the footer under "Ready for a clean car?".
- **The live thing:** the vehicle switch above the prices. Car, SUV or minivan re-prices all three tiles and carries the choice into the booking form.

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07080B` | The ground. Most of the page |
| `--surface` / `--surface-2` / `--surface-3` | `#12151B` / `#1A1F28` / `#232A35` | Tone steps instead of lines: the booking field, choice tiles, the price tiles |
| `--ink` | `#F4F5F7` | All running text (never grey for body copy) |
| `--muted` | `#A7AEB8` | Secondary notes only (8.9:1 on the ground) |
| `--accent` | `#29C8FF` | The action: Book buttons, the selected day and time, the Full Detail tile |
| `--accent-ink` | `#04131A` | Text on the accent (9.7:1) |
| `--accent-deep` | `#1C9ACB` | The Full Detail tile's button strip |
| `--paper` / `--paper-ink` | `#F4F5F7` / `#07080B` | The printed slips (how it works, the quote, the confirmation) and the footer |
| `--field` | `#6B7584` | Form field edges, 3.6:1 against the booking field |

Rules: one ground, one ink, one accent. Separate surfaces with a tone step, never a line or a shadow. The only gradients are neutral scrims under text on the film and on the first reel poster.

## 3. Type

Two faces, both served from `fonts/` (SIL Open Font License): **Anton** for the name and headings, always uppercase; **Inter** for everything people read.

| Step | Size | Use |
|---|---|---|
| Monument | `clamp(76px, 14.6vw, 320px)`; 22vw on phones | The name in the hero, one line on desktop, two on phones |
| Heading | `clamp(40px, 5vw, 76px)` | Every section heading, prices, the quote total, contact rows |
| Lead | `clamp(20px, 1.7vw, 24px)` | Intro sentences, tile names, FAQ questions, the review's opening line |
| Body | 17px / 1.55 | Running text, with a 60ch measure where it runs long |
| Small | 14px | Captions, hints, labels |

No sixth size. The footer's cropped name (28vw, 34vw on phones) repeats the monument and is decorative (`aria-hidden`).

## 4. Layout

- 12 columns, 24px gutters (16px on phones), outer margins `clamp(16px, 2.2vw, 32px)` on both sides.
- Section padding `clamp(64px, 6.5vw, 104px)` top and bottom, so sections sit 128–208px apart.
- Neighbouring sections never share a layout. The order: hero (film title) → how it works (heading left, slip right) → prices (stepped tiles) → other services (statement, rates pushed right, before/after photo) → results (full-bleed band of unequal panels) → before and after (copy left, two sliders) → booking (its own field) → reviews (a letter) → about (side facts, wide paragraph) → FAQ (wide heading, indented questions) → contact (display rows) → footer (invitation over the cropped name).

## 5. Components

- **Buttons:** fully round, flat, one fill. Accent for the action, `--surface-3` for secondary, ink-on-paper in the footer. Hover lifts 2px; press settles.
- **Slips:** paper panels with a zigzag bottom edge (`clip-path`). Used for the itinerary, the quote and the booking confirmation. The total sits on an ink bar.
- **Price tiles:** three flat tiles stepping 360 / 480 / 600px tall, square-ish 4px corners, a darker strip at the bottom that is the whole button.
- **Rates:** three-part rows (kind, name with its note, price), grouped by space, bookable rows link to the form.
- **Band:** four panels with flex-grow 5 / 2 / 3 / 2. Hovering on desktop widens a panel; each reel plays in place with its sound when you press its round play button.
- **Form controls:** real inputs with 2px `--field` edges. Choice tiles are tone fills with an accent outline when selected. Errors are explained in words next to the Book button.
- **Letter:** the newest review in a 620px column, first sentence at lead size, no quotation marks.
- **FAQ:** `<details>` rows with a two-stroke chevron; an open row gets a `--surface` tile.

## 6. Motion

Personality: energetic but disciplined. One signature ease (`power3.out`, fast in and soft out), three durations (0.2s / 0.5s / 0.9s), staggers that finish inside 0.5s, and three layers: the name is primary, copy and prices are secondary, the foam is ambient. Scroll scenes live in `js/motion.js` (GSAP 3.13 with ScrollTrigger and SplitText); the foam is `js/bubbles.js` (Three.js r172). Both are self-hosted in `vendor/`. See `docs/adr/0001-gsap-and-threejs.md` for why.

- **Hero (wide screens):**
  - The name starts as a window cut out of black, with the driveway film playing inside the letters, and its letters rise in one by one.
  - Scrolling grows the name until the black dissolves and the whole film shows. Then the sentence and the hero's Book button arrive. This is the page's one pinned moment.
  - Phones and reduced motion keep the plain hero: the film with the name across the bottom.
- **Foam and droplet (wide screens):**
  - About two dozen iridescent soap bubbles drift up over the film, lean away from the pointer and pop when clicked.
  - One big water droplet bends the film behind it like a lens. It follows the pointer and bursts into foam when clicked, then forms again.
  - None of it loads on phones, with data saver, on low-memory devices, or with reduced motion. It sleeps when the hero is off screen.
- **Smooth scrolling:** Lenis smooths the mouse wheel and same-page links, and moves focus to the link's target. Touch and keyboard scrolling stay the browser's own.
- **How a detail goes:** the receipt feeds up out of a printer's mouth in 12 mechanical steps, header first and torn edge last. It plays once; nothing is pinned or scroll-jacked.
- **Packages:**
  - Each package is a full screen with its own palette: rinse blue, leather, and bright showroom white.
  - As a package crosses the middle of the screen the whole page takes its colours. The background fades evenly over 600ms and the text flips at the halfway point, so it never goes grey on grey.
  - The name, price and list rise in, and the price counts up from $0. The vehicle switch rolls prices to the new amounts.
- **The wash (packages):** behind the three package screens one picture frame of the real car (`js/scrub.js`, a 2D canvas, no 3D). Exterior: the Sonata's dusty front end is wiped clean by a foam line that moves with the scroll (the real before and after photos). Interior: the same with the front seats. The Full Detail: the driveway walk-around film, cut into frames and scrubbed by scroll, so the clean car turns as you move. It loads when the stage is near, after the page has loaded, photos first and frames progressively, and sleeps off screen. The first frame stands in before it is ready and for reduced motion.
- **The reveal (hero, wide screens):** the first screen opens through a rain-beaded windshield (`js/glass.js`, WebGL, no library): the film is refracted through a height field of water drops, red, green and blue bent by slightly different amounts, then a leaning squeegee line sweeps left to right over 1.7 s and the glass goes clear to the plain film. The canvas removes itself when done, so it costs nothing after the first three seconds. Loads with the page on wide screens with motion, never on data saver or low-memory devices.
- **The corridor (results):** eight real pictures of the four reel cars (the reels' first frames and the Sonata's before and after photos) drawn as a passage toward a vanishing point (`js/corridor.js`, 2D canvas, the card-tunnel renderer ported as written). Loops every 20 s on wide screens with motion and sleeps off screen; phones and reduced motion get one still frame. Loads when its band is a screen away, after the page has loaded.
- **The pointer (fine pointers only):** a 6px dot pinned to the pointer and a 36px ring that follows on a lerp (0.14) and grows 1.9× over anything pressable (`js/cursor.js`). Drawn in difference blend so it reads on every package colour. The system cursor stays; the layer never takes clicks or focus, and unmounts if the pointer or motion preference changes.
- **Small ports from React Bits (in CSS):** section headings arrive from a blur as well as a rise (BlurText); a sheen crosses the launch-deal badge every 4.5 s (ShinyText). Both are motion-only.
- **Package builder:** in the booking form, the chosen package lights up the part of a drawn car it cleans (outside, inside, or both), with what's included and the live price.
- **Reels:** play muted while on screen and stop when they leave. A tap restarts one with sound and controls.
- **Rates and reels:** the rate rows arrive in a quick cascade; the four reel panels open like a shutter while each picture settles.
- **Signature:** the Sonata photo in the services section slowly crossfades from before to after, outside then inside (1.6s fades, 5.6s holds). It pauses off screen or when the tab is hidden.
- **Scroll:** the hero film sinks and dims as it leaves while the name lifts away (scroll-driven, Chrome and Edge). The footer's cropped name rises as the page reaches its end. Other parts rise 24px once, staggered 80ms.
- **Feedback:** every button, rate row, panel and control has a hover, press and focus state. A strip of light crosses a button when the pointer arrives, and with a mouse the main Book buttons lean slightly toward the pointer.
- **Texture:** a fine static film grain sits over the whole page, so no dark section is flat.
- **Loading rule:** motion never competes with the first paint. Phones fetch GSAP only after the page has loaded; wide screens fetch it at once (deferred) and load Three.js when the page is idle. If either fails to load, the CSS entrances play and the page works the same.
- **Reduced motion:** nothing extra is downloaded and everything is simply there. No travel, no autoplay, no foam, no smooth scrolling, and the crossfade stays on the first photo. The package colours still change, instantly.

## 7. Imagery

Only Letts Get Clean's own work: the driveway film (also cut into frames for the wash), the Sonata before and after photos, and the reels. License plates are always blurred. Square corners, `object-fit: cover`, one dominant picture per screen. Nothing found or stock.

## 8. Do and don't

**Do:** let the real photos carry the page; keep one action per screen; put prices and their real end dates in plain words; keep every section's heading in Anton.

**Don't:** add labels above headings, pill badges, monospace, numbered steps (01 / 02), hairline dividers, shadows on things at rest, glass, emoji or sparkle characters, a second accent colour, or a styled accent word inside a headline.

## 9. Responsive

At 900px and below: the nav collapses to a Menu button beside Book; the name stacks onto two lines; every two-column section stacks with copy first; the price tiles stack in rising order; the band becomes a 2 × 2 block (64/36 then 36/64); the quote slip follows the form. The calendar wraps into a grid instead of scrolling sideways.

## 10. Accessibility and compliance hooks

- Skip link, one `h1`, headings in order, labelled controls, and visible focus everywhere.
- Contrast is checked: text at 4.5:1 and up; controls and field edges at 3:1 and up.
- axe-core 4.10 reports 0 violations on every page at 1440 and 390.
- The policy pages share `legal.css` and the same footer links. The compliance standard behind them is the `website-compliance` skill; see `COMPLIANCE_REPORT.md`.
