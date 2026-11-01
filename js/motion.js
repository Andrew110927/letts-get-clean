// Scroll motion for the home page: GSAP 3.13 with ScrollTrigger and SplitText, served from vendor/.
// index.html loads it only when the device allows motion: right away on wide screens, after the page has loaded on phones
// (so it never competes with the hero photo). If it fails to load, the CSS entrances in index.html play instead.
// The hero name is never hidden for longer than the 2.5s fallback set in <head>.
(() => {
  "use strict";
  const html = document.documentElement;
  const ready = () => html.classList.remove("motion-wait");
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { ready(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // One signature ease and three durations for the whole page, so the motion reads as one personality.
  const EASE = "power3.out", QUICK = 0.2, STD = 0.5, SLOW = 0.9;
  gsap.defaults({ ease: EASE, duration: STD });
  const $ = (s) => document.querySelector(s), $$ = (s, root) => [...(root || document).querySelectorAll(s)];
  const amount = (text) => Number(String(text).replace(/[^0-9.]/g, "")) || 0;

  // Counts a price element from one amount to another (the tiles' figures, and the vehicle switch).
  function countTo(el, from, to, duration) {
    const box = { v: from };
    return gsap.to(box, { v: to, duration: duration || SLOW, ease: "power2.out", onUpdate: () => { el.textContent = "$" + Math.round(box.v).toLocaleString(); } });
  }

  const mm = gsap.matchMedia();
  mm.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 901px)", hover: "(hover: hover) and (pointer: fine)" }, (ctx) => {
    const { motion, wide, hover } = ctx.conditions;
    if (!motion) { ready(); return; }
    const off = [];
    const listen = (target, type, fn) => { target.addEventListener(type, fn); off.push(() => target.removeEventListener(type, fn)); };

    html.classList.add("gsap-on");

    // ---- The name (wide screens): its letters rise into place one after another, then the sentence arrives.
    // Phones keep the CSS entrance, which has already played by the time this file arrives there.
    // Split letters read badly aloud ("L e t t s"), so the heading carries its name and the letters are hidden from readers.
    const name = $("#heroName"), lines = $$("#heroName [data-line]");
    let split = null;
    if (wide) {
      html.classList.add("gsap-hero");
      name.setAttribute("aria-label", "Letts Get Clean");
      lines.forEach(l => l.setAttribute("aria-hidden", "true"));
      // Letters are measured in the brand face, so load it first (it's preloaded; give up after 1.2s and use what's there).
      // Asking for Anton by name matters: fonts.ready can resolve before the page has even started fetching it.
      const fontsIn = document.fonts ? Promise.race([document.fonts.load('400 1em "Anton"').catch(() => {}).then(() => document.fonts.ready), new Promise(r => setTimeout(r, 1200))]) : Promise.resolve();
      fontsIn.then(ctx.add(() => {
        split = SplitText.create(lines, { type: "words,chars", tag: "span", aria: "none" });
        gsap.set(split.chars, { yPercent: 115 });
        ready();
        gsap.timeline({ delay: 0.05 })
          .to(split.chars, { yPercent: 0, duration: SLOW, ease: "expo.out", stagger: 0.028 })
          .from("#heroLine", { y: 16, opacity: 0, duration: STD }, 0.35);
      }));
    } else ready();

    // Groups below the fold are hidden once and revealed once. When the page re-renders (live prices arrive),
    // only groups that haven't been seen yet are hidden again, so nothing flashes and nothing replays.
    // Anything already on screen or scrolled past when this file arrives is left exactly as it is.
    const below = (el) => el && el.getBoundingClientRect().top > innerHeight;
    const groups = [];
    function group(trigger, targets, hidden, shown, start, onReveal) {
      const g = { done: !below($(trigger)) };
      if (g.done) return g;
      g.hide = () => { if (!g.done) gsap.set(targets(), hidden); };
      g.hide();
      ScrollTrigger.create({ trigger, start: start || "top 82%", once: true, onEnter: () => {
        g.done = true;
        gsap.to(targets(), { ...shown, overwrite: true });
        if (onReveal) onReveal();
      } });
      groups.push(g);
      return g;
    }
    // ---- How a detail goes: the receipt feeds up out of the printer in short mechanical steps, about one line per
    // step, header first and torn edge last. It plays once and stays printed (no pinning, nothing scroll-jacked).
    group(".how .printer", () => [$(".how .slip")], { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: "steps(12)" }, "top 70%");

    // ---- Prices: the tiles grow up from a shared floor like the bar chart they are, and the figures count up.
    const tiles = () => $$("#pkGrid .tile");
    const tileGroup = group("#pkGrid", tiles, { scaleY: 0, transformOrigin: "50% 100%" },
      { scaleY: 1, duration: SLOW, ease: "power4.out", stagger: 0.08 }, "top 75%",
      () => tiles().forEach((t, i) => {
        const price = t.querySelector(".price"), to = amount(price.textContent);
        price.textContent = "$0";
        gsap.delayedCall(0.15 + i * 0.08, () => countTo(price, 0, to));
        gsap.from(t.querySelectorAll(".in > *:not(.price), .buy"), { opacity: 0, y: 14, duration: STD, delay: 0.3 + i * 0.08, stagger: 0.04 });
      }));
    // The vehicle switch: once the tiles have been seen, the prices roll to their new amounts instead of jumping.
    listen(document, "lgc:prices", (e) => {
      if (!tileGroup.done) { tileGroup.hide(); return; }
      const was = (e.detail && e.detail.was) || [];
      // The new tiles start on the old price (no frame of the new one first), then roll.
      tiles().forEach((t, i) => {
        const el = t.querySelector(".price"), to = amount(el.textContent);
        if (was[i]) { el.textContent = was[i]; countTo(el, amount(was[i]), to, STD); }
      });
    });

    // ---- Every other rate: the rows arrive in a quick cascade.
    group("#rates", () => $$("#rates > *"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.035 });

    // ---- The reels: the band of panels opens like a shutter, each picture settling as it's uncovered.
    group(".band", () => $$(".band .panel"), { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: SLOW, ease: "power4.inOut", stagger: 0.08 }, "top 78%",
      () => gsap.from($$(".band .panel > video, .band .panel > img"), { scale: 1.18, duration: SLOW * 1.4, stagger: 0.08 }));

    // ---- The footer: the cropped name rises as the page reaches its end.
    gsap.fromTo(".giant", { yPercent: 80 }, { yPercent: 30, ease: "none", scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: 0.6 } });

    // ---- Ambient: soap bubbles over the hero film, loaded once the page is idle. Wide screens only, and not on
    // data saver or low-memory devices; js/bubbles.js sleeps whenever the hero is off screen.
    let stopFoam = null, foamOff = false;
    const lite = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 4);
    if (wide && !lite) {
      const go = () => { if (!foamOff) import("./bubbles.js").then(m => { if (!foamOff) stopFoam = m.start($(".hero")); }).catch(() => {}); };
      const whenIdle = () => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200));
      if (document.readyState === "complete") whenIdle(); else listen(window, "load", whenIdle);
    }
    off.push(() => { foamOff = true; if (stopFoam) stopFoam(); });

    // ---- Feedback: the main Book buttons lean a little toward the pointer (mouse only, never on touch).
    // The lean goes on the CSS translate property, so the buttons' own hover lift and press (transform) still work.
    if (hover && wide) $$(".top .btn, footer .btn-dark, #bookBtn").forEach(btn => {
      const at = { x: 0, y: 0 }, apply = () => { btn.style.translate = at.x || at.y ? `${at.x}px ${at.y}px` : ""; };
      const x = gsap.quickTo(at, "x", { duration: QUICK * 2, onUpdate: apply }), y = gsap.quickTo(at, "y", { duration: QUICK * 2, onUpdate: apply });
      listen(btn, "pointermove", (e) => { const r = btn.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.2); y((e.clientY - r.top - r.height / 2) * 0.25); });
      listen(btn, "pointerleave", () => { x(0); y(0); });
      off.push(() => { btn.style.translate = ""; });
    });

    // Live data re-draws rows and tiles: re-hide whatever hasn't been revealed yet.
    listen(document, "lgc:render", () => groups.forEach(g => g.hide()));
    // Anything that changes the page's height (the consent panel closing on phones, live prices, fonts, the reviews)
    // moves every trigger point, so re-measure once the page settles.
    let refreshT = 0;
    const heightWatch = new ResizeObserver(() => { clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 150); });
    heightWatch.observe(document.body);
    off.push(() => heightWatch.disconnect());

    return () => {
      off.forEach(fn => fn()); if (split) split.revert();
      name.removeAttribute("aria-label"); lines.forEach(l => l.removeAttribute("aria-hidden"));
      html.classList.remove("gsap-on", "gsap-hero");
    };
  });
})();
