# Image prompt pack (ready for when an image key exists)

Four of the design skills generate pictures: **imagegen-frontend-web**, **image-to-code**, **brandkit** and **imagegen-frontend-mobile**. They all go through the `generate-image` skill, which needs an OpenRouter key. This PC doesn't have one yet (checked Oct 31, 2026), so nothing here has been generated.

What exists instead, built from the real assets:
- `design/brand-board.png`: the brandkit 3 × 3 board.
- `design/phone-flow.png`: four real phone screens in clean mockups.

Every prompt below follows its skill's rules, so the set can be generated the day a key is added.

## How to run (costs money per image)

1. Make an OpenRouter key at https://openrouter.ai/keys.
2. Save it as `OPENROUTER_API_KEY=...` in a `.env` file that git ignores. `supabase/.env*` is already ignored; a root `.env` would need adding to `.gitignore` first. Never paste it into chat.
3. From `~/.claude/skills/generate-image`, run one command per image, for example:

```bash
python scripts/generate_image.py "<prompt>" --aspect-ratio 16:9 --resolution 2K -o "<site>/design/refs/web-01-hero.png"
```

4. Open each result and check it before using it. Models garble text, so the real words stay in the HTML.

Generated images are design references only: they guide refinements to the code (the image-to-code loop: generate, analyze, adjust). They never go on the site as if they were photos of real jobs.

## Shared brand lock (paste into every prompt)

> Brand: Letts Get Clean, a one-person mobile car detailing business in Orange County, New York. Ground #07080B near-black, ink #F4F5F7, single accent #29C8FF electric sky blue used only on actions; paper #F4F5F7 for printed receipt slips with a zigzag bottom edge. Type: Anton, condensed uppercase, for the name and headings; Inter for body. Round pill buttons, square photo corners, flat colour, no gradients except neutral scrims, no shadows at rest, no badges, no labels above headings. Imagery: real driveways, a white Hyundai Sonata, foam and hand washing, license plates blurred. Mood: confident, local, a little cheeky; tagline "Dirty car? Not for long." Keep text minimal and large; no fake small text.

## imagegen-frontend-web: one horizontal image per section (11 images)

The combination committed for the whole set:
- **Look:** deep dark theme, full-bleed cinematic background, compressed statement type.
- **Hero:** inline typography behemoth over an image-first hero.
- **Section flow:** asymmetric premium.
- **Components:** hover-accordion slices (the reel band), off-grid editorial layout, layered image crop frames, and a product UI panel stack (the booking form and quote slip).
- **Motion cues:** cinematic fade-through and staggered float-up.
- **Concept spine:** artifact and receipt.
- **Second-read moment:** the cropped giant name in the footer.

1. **Hero (16:9):** Full-bleed photo of a freshly washed white sedan in a leafy suburban driveway, the subject in the upper two-thirds. Across the bottom edge, the words LETTS GET CLEAN in huge white condensed uppercase, edge to edge on 32px margins, over a soft dark scrim. Above its left end, one 18px white sentence on three lines. A plain top bar: round mascot badge and wordmark at left, five small links and one sky-blue Book pill at right.
2. **How it works (16:10):** Near-black field. At left, a big uppercase heading "How a detail goes" with a 30-character-wide paragraph. At right, a paper receipt slip with a zigzag bottom: grouped rows (Online, Before the day, On the day), each with left text, dotted leaders and a right value. The last row is inverted on a black bar: "Pay after the job · cash, Cash App, Venmo".
3. **Prices (16:10):** Three flat tiles in a row, bottoms aligned, stepping up in height like a bar chart: dark grey, slightly lighter grey, then sky blue for "The Full Detail". Each shows name, big price ($25, $30, $50) and a few plain lines, with a darker strip at the bottom that is the button. Above the two shorter tiles: the heading "Pick your package" and a pill switch "Car / sedan · SUV / truck +$10 · Minivan / 3-row +$15".
4. **Other services (16:10):** A two-line uppercase heading "Bikes, trash cans, whole houses too", first line indented. Below, a rates table pushed into the right five columns: three-part rows (kind, name with a small note, price), grouped by space. Bottom-left, one 4:5 photo of a sedan's front end.
5. **Results band (21:9):** A modest heading, then one edge-to-edge band of four tall vertical video stills with no gaps and unequal widths (5 : 2 : 3 : 2): a sedan reveal, a close-up, a white wagon, a pickup grille. A white round play button on three panels, and a title in the top-left corner of the first.
6. **Before and after (16:10):** At left, the heading "Before and after" with one sentence. At right, two big 4:5 comparison sliders side by side: a vertical white line with a sky-blue round knob, and "Before" and "After" chips.
7. **Booking (16:10):** A slightly lighter dark field. At left, a working form: choice tiles, a calendar grid of day buttons, time buttons, and labeled inputs with clear grey edges. At right, a paper quote slip with a zigzag edge, "Your quote: The Full Detail", a black total bar showing a big $50, a progress bar, an agree checkbox and a sky-blue Book button.
8. **Review letter (16:10):** Near-black, lots of space. At left, the heading "What customers say" and a one-line average. At right, one review set like a letter in a 38-character column: the first sentence at 24px, the sign-off name and five small blue stars.
9. **About (16:10):** Thin side-facts column at left (round mascot badge, Owner, Based in, First jobs). A wide paragraph from the 34% line, with "Hey, I'm Andrew" as a modest uppercase heading. A second row of two small lists: ways to pay and towns.
10. **FAQ (16:10):** A wide uppercase heading "Questions, answered" from the left margin. Questions indented to start at column 5, each with a thin chevron at the right, separated by space only. One open question sits on a slightly lighter tile.
11. **Contact and footer (16:9):** Full-width display rows in big condensed uppercase, alternating two dark tones: "Letts Get Clean", "Newburgh, Orange County, NY", the hours, the phone, and "Book a time" with a round blue arrow. Then a light paper footer: "Ready for a clean car?" with a black pill button, and the wordmark LETTS GET CLEAN cropped by the bottom edge at enormous size.

## image-to-code: the loop once the images exist

Generate each of the 11 images above as its own picture, never cropped out of a bigger board. Analyze each one for text, type scale, spacing, buttons and colors. Change the code only where a reference is clearly better than the current build, and run the inspector, axe and the Playwright checks again afterwards.

## brandkit: build on the existing brand (16:10, 3 × 3)

> Create a premium brand-kit overview image for "Letts Get Clean". Identity mode: build on the existing brand. Reuse the existing logo exactly: a cartoon beagle-like dog in sunglasses holding a soapy sponge in a round navy badge, under the words "Mama Letts approved", and the skewed condensed wordmark LETTS with GET CLEAN in sky blue. Do not redesign the logo. Category: mobile car detailing, local, owner-run. Core metaphor: the name is an invitation ("let's get clean"). Panels: logo cover; the wordmark on near-black, paper and sky blue; the website hero in a browser frame with the name across a driveway photo; the voice line "Dirty car? Not for long."; palette #07080B / #29C8FF / #F4F5F7 / #1A1F28; Anton and Inter type specimen; a business card and a car magnet; a cinematic driveway photo with a washed white sedan; UI parts (pill buttons, a paper receipt slip with a zigzag edge, a price tile strip). Dark charcoal canvas, strong gutters, very little text.

## imagegen-frontend-mobile: the phone flow (4 screens, one per image)

The design bible for the set:
- **Platform:** cross-platform premium neutral, in a subtle iPhone-style frame.
- **Look:** deep dark theme, expressive display type with a clean body face, media-led storytelling.
- **Imagery:** cinematic photos of real driveways, clean flat surfaces with one textured hero area.
- **Palette:** restrained monochrome plus one accent (#29C8FF).
- **Components:** premium segmented control, framed product card stack, checkout summary card, photo-led card strip.
- **Decorative assets:** tiny directional arrows, clean badge glyphs.
- **Motion cues:** sheet rise, staggered list reveal.

1. **Home:** Full-screen photo of a washed white sedan in a driveway. LETTS / GET CLEAN stacked huge at the bottom over a dark fade. One readable sentence above: price from $25 and the next opening time. Wordmark at top-left with a blue Book pill and a Menu pill.
2. **Prices:** The heading "Pick your package", a segmented vehicle switch with SUV selected, and a stacked dark price tile showing $35 and "$45 after Nov 16", with its full-width "Book Exterior" strip.
3. **Book:** The heading "Day and time", a calendar grid of rounded-square day buttons with today in blue, and two time buttons with 1:30 PM selected.
4. **Booked:** A paper confirmation slip with a zigzag edge, a blue check, the big uppercase "Booked: Sunday, November 1 at 1:30 PM", a recap box (The Full Detail · SUV / truck · Total $60 · pay after the job), and the next steps.
