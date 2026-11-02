// Scroll motion for the home page: GSAP 3.13 with ScrollTrigger, and Lenis, served from vendor/.
// index.html loads it only when the device allows motion: right away on wide screens, after the page has loaded on phones
// (so it never competes with the hero photo). If it fails to load, the CSS entrances in index.html play instead.
(() => {
  "use strict";
  const html = document.documentElement;
  const ready = () => html.classList.remove("motion-wait");
  if (!window.gsap || !window.ScrollTrigger || !window.Lenis) { ready(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // One signature ease and three durations for the whole page, so the motion reads as one personality.
  const EASE = "power3.out", QUICK = 0.2, STD = 0.5, SLOW = 0.9;
  gsap.defaults({ ease: EASE, duration: STD });
  const $ = (s) => document.querySelector(s), $$ = (s, root) => [...(root || document).querySelectorAll(s)];
  const amount = (text) => Number(String(text).replace(/[^0-9.]/g, "")) || 0;

  // Counts a price element from one amount to another (the package prices, and the vehicle switch).
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

    // ---- Smooth wheel scrolling (Lenis), driven by GSAP's clock so every ScrollTrigger stays in step with it.
    // Touch and keyboard scrolling stay the browser's own.
    const lenis = new Lenis({ autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const lenisTick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisTick);
    // Same-page links glide as well. Focus still moves to the target, so the skip link and keyboard users land where they read.
    listen(document, "click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute("href").slice(1), target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -88 });
      history.pushState(null, "", "#" + id);
      if (!target.matches("a,button,input,select,textarea,[tabindex]")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    // The full-screen menu locks the page; Lenis has to stop with it or the wheel would still move the page underneath.
    const menuEl = $("#menu");
    const menuWatch = new MutationObserver(() => (menuEl.hidden ? lenis.start() : lenis.stop()));
    menuWatch.observe(menuEl, { attributes: true, attributeFilter: ["hidden"] });
    off.push(() => { gsap.ticker.remove(lenisTick); menuWatch.disconnect(); lenis.destroy(); });


    // The first screen's entrance is CSS (data-load in index.html), so it never waits for this file.
    ready();

    // Groups below the fold are hidden once and revealed once. When the page re-renders (live prices arrive),
    // only groups that haven't been seen yet are hidden again, so nothing flashes and nothing replays.
    // Anything already on screen or scrolled past when this file arrives is left exactly as it is.
    const below = (el) => el && el.getBoundingClientRect().top > innerHeight;
    const groups = [];
    function group(trigger, targets, hidden, shown, start, onReveal) {
      const g = { done: !below($(trigger)), targets };
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

    // ---- Packages: each card's words arrive as it scrolls in. Name, price, list and button
    // rise in turn and the price counts up from $0. Selectors go by id because live prices re-draw the screens.
    const pkParts = (id) => { const pk = document.getElementById(id); return pk ? [...pk.querySelectorAll(".pk-name, .price, .after, li, .pk-cta")] : []; };
    const pkGroups = $$("#pkGrid .pk").map(pk => pk.id).map(id => [id, group("#" + id, () => pkParts(id), { opacity: 0, y: 28 },
      { opacity: 1, y: 0, stagger: 0.06 }, "top 70%", () => {
        const pk = document.getElementById(id);
        if (!pk) return;
        const price = pk.querySelector(".price"), to = amount(price.textContent);
        price.textContent = "$0";
        gsap.delayedCall(0.2, () => countTo(price, 0, to));
      })]);
    // The vehicle switch: packages already seen roll their prices to the new amounts instead of jumping; the new sections
    // start on the old price (no frame of the new one first). Packages not seen yet stay hidden for their entrance.
    listen(document, "lgc:prices", (e) => {
      const was = (e.detail && e.detail.was) || [];
      pkGroups.forEach(([id, g], i) => {
        if (!g.done) { g.hide(); return; }
        const el = document.querySelector("#" + id + " .price");
        if (!el || !was[i]) return;
        const to = amount(el.textContent);
        el.textContent = was[i];
        countTo(el, amount(was[i]), to, STD);
      });
    });

    // ---- Reviews: the stars pop in one after another when the letter arrives.
    group("#reviews", () => $$("#reviews .stars svg"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.07, ease: "back.out(2.2)", duration: STD }, "top 75%");

    // ---- Every other rate: the rows arrive in a quick cascade.
    group("#rates", () => $$("#rates > *"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.035 });

    // ---- The reels: the band of panels opens like a shutter, each picture settling as it's uncovered.
    group(".band", () => $$(".band .panel"), { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: SLOW, ease: "power4.inOut", stagger: 0.08 }, "top 78%",
      () => gsap.from($$(".band .panel > video, .band .panel > img"), { scale: 1.18, duration: SLOW * 1.4, stagger: 0.08 }));


    // ---- Feedback: the main Book buttons lean a little toward the pointer (mouse only, never on touch).
    // The lean goes on the CSS translate property, so the buttons' own hover lift and press (transform) still work.
    if (hover && wide) $$(".top .btn, .hero-actions .btn, footer .btn-dark, #bookBtn").forEach(btn => {
      const at = { x: 0, y: 0 }, apply = () => { btn.style.translate = at.x || at.y ? `${at.x}px ${at.y}px` : ""; };
      const x = gsap.quickTo(at, "x", { duration: QUICK * 2, onUpdate: apply }), y = gsap.quickTo(at, "y", { duration: QUICK * 2, onUpdate: apply });
      listen(btn, "pointermove", (e) => { const r = btn.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.2); y((e.clientY - r.top - r.height / 2) * 0.25); });
      listen(btn, "pointerleave", () => { x(0); y(0); });
      off.push(() => { btn.style.translate = ""; });
    });

    // Live data re-draws rows and sections: re-hide whatever hasn't been revealed yet.
    listen(document, "lgc:render", () => groups.forEach(g => g.hide()));
    // Pieces hidden after this setup ran (re-drawn by live data) aren't part of GSAP's own undo, so if motion is switched
    // off mid-visit, every group's pieces are put back to plain view by hand.
    // Anything that changes the page's height (the consent panel closing on phones, live prices, fonts, the reviews)
    // moves every trigger point, so re-measure once the page settles.
    let refreshT = 0;
    const heightWatch = new ResizeObserver(() => { clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 150); });
    heightWatch.observe(document.body);
    off.push(() => heightWatch.disconnect());

    return () => {
      groups.forEach(g => gsap.set(g.targets(), { clearProps: "opacity,transform,clipPath" }));
      off.forEach(fn => fn());
      html.classList.remove("gsap-on");
    };
  });
})();
