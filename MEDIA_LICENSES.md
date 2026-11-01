# Media licenses

Every image, video, icon and font on the public site, with where it came from. Checked October 31, 2026. Update this file whenever media is added.

| File(s) | What it is | Source | License / rights | Status |
|---|---|---|---|---|
| `media/ext_before.webp`, `media/ext_after.webp`, `media/int_before.webp`, `media/int_after.webp` | White Hyundai Sonata, before and after, outside and in | Andrew's own work and photos, plates blurred | Owned by Letts Get Clean | ✅ |
| `media/hero_loop.mp4`, `media/hero_poster.webp`, `media/hero_poster.jpg` | Hero film of the washed Sonata in a driveway (silent) | Andrew's own footage (per the repo history) | Owned by Letts Get Clean | ❓ Andrew to confirm he filmed it |
| `media/reel_web.mp4`, `media/reel_poster.webp`, `media/reel_web.vtt` | Sonata "the reveal", 0:28. **Plays a music track the whole way, no talking** (checked 10-31: speech detector found none; steady audio at about -10 dB) | Andrew's own footage | Footage owned; music made for Letts Get Clean by Claude (confirmed by Andrew 10-31) | ✅ Original, not a library song. Caption track marks the music |
| `media/reel2_web.mp4`, `media/reel2_poster.webp` | Subaru Outback inside and out, 0:43. The audio track is silent (checked 10-31: -91 dB) | Andrew's own footage | Owned by Letts Get Clean | ✅ |
| `media/reel3_web.mp4`, `media/reel3_poster.webp` | Chevy Silverado interior and wheels, 0:26 (silent) | Andrew's own footage | Owned by Letts Get Clean | ✅ |
| `media/mascot.webp`, `media/mascot-160.webp`, `media/mascot-lockup.webp`, `media/og-card.jpg`, `media/favicon-64.png`, `media/icon-180.png` | Cartoon dog mascot, logo lockup, share image, icons | Made by Andrew Letts, based on his own dog (confirmed 10-31) | Owned by Letts Get Clean | ✅ |
| `print/*.png`, `print/*.pdf` | Business card, magnets, flyers, punch cards, yard sign | Built from the mascot and site photos (`print/source/build.py`) | Owned by Letts Get Clean | ✅ |
| Inline SVG icons in `index.html` (arrows, play, check, calendar, message, social marks) | Interface icons | Hand-written paths | Owned (if any were copied from Lucide or Feather: ISC/MIT, no attribution needed) | ✅ |
| `fonts/anton-latin.woff2` + `fonts/OFL-Anton.txt` | Anton typeface | Google Fonts (The Anton Project Authors) | SIL Open Font License 1.1, license included | ✅ |
| `fonts/inter-latin.woff2` + `fonts/OFL-Inter.txt` | Inter typeface | Google Fonts (The Inter Project Authors) | SIL Open Font License 1.1, license included | ✅ |
| `design/brand-board.png`, `design/phone-flow.png`, `design/phone-*.png`, `design/board-site.jpg` | Brand board and phone flow (not on the public site) | Rendered from the site and the files above | Same as their sources | ✅ (internal) |

**Rules for new media:**
- Only real Letts Get Clean work.
- Blur every license plate (`local-tools/plate-blur/` for video), and get permission before showing a customer's face.
- No stock photos passed off as our results, and no other companies' logos or characters.
- Music only with a license that covers websites.
