# ADR 0001: GSAP and Three.js for the home page motion

Status: accepted, October 31, 2026

## Context

Andrew asked for the site to be "way better and cooler" using the motion and 3D skills just added (GSAP, Three.js,
motion design). The site is one static page on GitHub Pages with a strict CSP (`'self'` only) and a compliance bar:
axe 0, Lighthouse accessibility 100, nothing optional stored, no third-party requests.

## Decision

- **GSAP 3.13** (core, ScrollTrigger, SplitText) for the scroll scenes, and **Three.js r172** for the hero foam.
  Both are downloaded once into `vendor/` and served by the site itself, so the CSP and the "no third parties" rule
  stay as they were. No build step and no npm packages ship.
- GSAP is loaded only when the visitor allows motion: at once on wide screens, after the page has loaded on phones.
  Three.js is imported only on wide screens, when the page is idle, and never with data saver or on low-memory devices.
- Everything degrades to the CSS entrances that were already there.

## Alternatives considered

- **CSS only (scroll-driven animations):** no download, but no Safari/Firefox support for scroll timelines yet, no
  letter splitting, and no count-up or price roll. Kept for the hero's scroll-away, which already works this way.
- **Raw WebGL for the bubbles:** about 150 lines instead of about 175 KB gzipped of Three.js. Rejected because Andrew
  asked to use Three.js, and the code stays easier to change. It costs nothing on phones, which never load it.
- **A CDN copy of either library:** faster first visit for some, but it would add a third-party request and need a
  CSP change. Rejected.

## Consequences

- About 50 KB gzipped of GSAP (plus 4 KB for `js/motion.js`) on every motion-allowed visit, and about 175 KB of Three.js on wide screens after idle.
  Measured on a throttled phone, the largest paint is the same as before (about 0.65 s).
- GSAP's license is GreenSock's Standard "no charge" license (commercial use allowed); Three.js is MIT. Both noted in
  `MEDIA_LICENSES.md`.
- To update a library, download the new version into `vendor/`, keep its license header, and re-run the checks in
  `COMPLIANCE_REPORT.md`.
