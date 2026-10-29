# Letts Get Clean print files

Everything here is ready to send to a printer. Each piece has two files:

- **The PDF is the print file.** Upload it as it is. Don't resize it or turn it into a picture first.
- **The PNG is just a preview** of the finished piece, to look at or to text to someone. Don't print from it.

| Piece | Print file | Finished size | Sides |
|---|---|---|---|
| Business card | `business-card.pdf` | 3.5 × 2 in | 2 (front, back) |
| Loyalty card, 6th detail free | `punch-card-6th-free.pdf` | 3.5 × 2 in | 2 |
| Loyalty card, 6th detail half off | `punch-card-6th-half-off.pdf` | 3.5 × 2 in | 2 |
| Car magnet, smaller | `car-magnet-12x18.pdf` | 18 wide × 12 tall | 1 |
| Car magnet, bigger | `car-magnet-12x24.pdf` | 24 wide × 12 tall | 1 |
| Yard sign | `yard-sign-18x24.pdf` | 24 wide × 18 tall | 1 (use it for both sides) |
| Flyer | `flyer-letter-8.5x11.pdf` | 8.5 × 11 in | 1 |
| Half-page flyer | `flyer-half-page-5.5x8.5.pdf` | 5.5 × 8.5 in | 1 |

## Things to know before you order

**The extra edge ("bleed").** Every PDF is 1/8 inch bigger on each side than the finished size. The dark background runs into that extra edge, and the printer cuts it off. That way a cut that's a hair off never leaves a white line. If an order page asks, pick **"full bleed"** or **"background goes to the edge"**. If it says the file is slightly bigger than the size you picked, that's expected.

**QR codes.** Each one opens the website with a tag, so the "How did you hear about us?" question fills itself in and you can see which piece brought the booking:

| Piece | QR opens | Booking form shows |
|---|---|---|
| Business card, loyalty cards | `…/letts-get-clean/?src=card` | Business card |
| Car magnets | `…/letts-get-clean/?src=magnet` | Car magnet |
| Yard sign | `…/letts-get-clean/?src=yardsign` | Yard sign |
| Both flyers | `…/letts-get-clean/?src=flyer` | Flyer |

Every QR code was read by two different QR readers, straight from the PDF, and each link was opened on the live site to check the booking form fills in. They're dark on a white square on purpose: some phones can't read light-on-dark codes. **Scan one with your own phone before you order a big batch.**

**Prices.** Only the two flyers show prices, and they're the regular ones (Exterior $35, Interior $40, The Full Detail $70, bike $20, trash cans $15 a can, house wash $300). The launch prices end Nov 16, so they're left off. The cards, magnets and yard sign have no prices, so they never go out of date. If you change a price, the flyers need making again (see the end of this page).

**Colors.** A screen glows and paper doesn't, so the electric blue prints a little softer than it looks here, and the black prints as a deep black. That's normal. For a big order, ask for a printed proof first if the shop offers one.

**Your address isn't on anything.** Only the phone number, the website and "Orange County, NY".

## Which printer for which piece

Three cheap places cover everything:

- **Vistaprint** (online, ships to you in about a week). Usually the cheapest for cards, magnets and yard signs, and there's almost always a coupon for a first order. Upload the PDF; it shows you a preview before you pay.
- **Staples** (Print & Marketing, in store or online). Good when you need something the same day, mostly cards and flyers. Bring the PDF on a USB stick or upload it on their site.
- **A local sign shop** (Newburgh / Middletown area). Good for one or two magnets or yard signs. Often close to the online price, you can see it before paying, and no shipping.

### Business cards

- Order **standard business cards, 3.5 × 2 in, printed on both sides**. Page 1 of the PDF is the front, page 2 the back.
- Paper: **matte**, 14 pt or 16 pt (thicker feels nicer). Matte keeps fingerprints off a dark card.
- 250 is a good first batch. Vistaprint is cheapest; Staples can do them the same day.

### Loyalty (punch) card

- **Pick one:** `punch-card-6th-free.pdf` (6th detail free) or `punch-card-6th-half-off.pdf` (6th detail half off). Don't order both.
- Order the same way as business cards (Vistaprint also lists them as "loyalty cards"). Choose **matte or uncoated** paper so a pen writes on the name line. Glossy smears.
- Give one at the first detail and punch a hole in a numbered circle each time. The 6th circle is the reward. Any small hole punch works; a star-shaped one makes the cards hard to fake.
- The card doesn't say which services count. If you want a rule (like "car details only"), say so and a line gets added.

### Car magnets

Two sizes are here because you haven't picked one yet. **Measure the flat part of your door** (skip the bumps and creases) and pick the size that fits:

- **12 × 18 in** fits most car doors.
- **12 × 24 in** is easier to read and fits bigger SUV and truck doors.

Order **car door magnets** in that size, a pair (one for each front door, same file twice). The shop rounds the corners; everything important already stays clear of them.

- Magnets only stick to steel. Some trucks and newer cars have aluminum or plastic doors; check with a fridge magnet first.
- Put them on clean, waxed paint, and take them off once a week to wipe underneath so they don't trap water.

**Want it on a window instead?** Ask for **perforated window film** in the same size and send the same PDF. It looks solid from outside and you can still see out from inside. Check your state's rules for the rear window.

### Yard sign

- Order an **18 × 24 in corrugated plastic (Coroplast) yard sign with an H-stake**, landscape (24 wide). Ask for **double-sided** and use the same PDF for both sides so it reads from both directions of the street.
- Vistaprint or a local sign shop. One or two signs are a good fit for a sign shop.
- Put it on a customer's lawn only with their OK.

### Flyers

- **Letter, 8.5 × 11** (`flyer-letter-8.5x11.pdf`): bulletin boards at laundromats, grocery stores, the library and so on. Order **flyers, 8.5 × 11, one side, full bleed**, on 80 lb or 100 lb gloss or matte paper. Staples can print a stack the same day.
- **Half page, 5.5 × 8.5** (`flyer-half-page-5.5x8.5.pdf`): handouts, and leaving one with a customer for their neighbors. Vistaprint sells this exact size.
- If a shop can't print all the way to the edge, you'll get a thin white border. That still looks fine.
- Home printing isn't a good fit: a full dark page uses a lot of ink and home printers can't reach the edges.

## Not included yet

- **Gift cards**: they need Stripe set up first.
- **A pop-up / car show sign**: the website already understands `?src=popup` for one, if you want it later.

## Making the files again (for whoever updates them)

The files are made by `source/build.py` from the templates in `source/templates/`. It reads the prices and phone number from `DEFAULTS` in `index.html`, prints each piece to PDF with Google Chrome, makes the previews, and then checks every file: page size, fonts, no launch prices, nothing outside the safe area, and every QR code read with two readers. It stops with a plain message if anything is off.

```
pip install segno pymupdf zxing-cpp opencv-python-headless pillow
python print/source/build.py
```

The mascot art is 640 pixels wide, which is sharp on cards and flyers and fine on the magnets and yard sign from a few feet away. If you have a bigger original of the mascot from whoever drew it, swapping it in makes the big pieces sharper.
