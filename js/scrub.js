// The wash, made of real pictures of the real car. Behind the three package screens one picture frame shows:
// Exterior: the Sonata's dusty front end wiped clean by a foam line that moves with the scroll (the real before and
// after photos); Interior: the same with the front seats; The Full Detail: the driveway walk-around film, scrubbed by
// scroll, so the clean car turns as you move. No 3D, nothing made up. index.html imports this when the stage is near,
// with motion allowed; it sleeps off screen. Decorative: the canvas is hidden from screen readers.
const DESKTOP = { dir: "media/turn/", count: 64, pair: "" }, PHONE = { dir: "media/turn-s/", count: 48, pair: "-720" };
const PHOTOS = ["ext_before", "ext_after", "int_before", "int_after"];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const base = new URL("../", import.meta.url).href;

function load(src) {
  return new Promise((ok) => { const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = base + src; });
}

// The foam: a strip of white rings drawn once, slid along the wipe line and faded at both edges.
function foamStrip(h) {
  const c = document.createElement("canvas"); c.width = 220; c.height = h;
  const ctx = c.getContext("2d");
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < h * 2.2; i++) {
    // Denser toward the middle of the strip, so the edge of the foam breaks up into stray bubbles.
    const x = (rnd() + rnd()) * 110, y = rnd() * h, r = 1.5 + rnd() * rnd() * 9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
  }
  return c;
}

export function start(stage, opts = {}) {
  const wrap = stage.parentElement, meter = stage.querySelector(".wash-load");
  const say = (n) => { if (meter) meter.textContent = n + "%"; };
  const phone = opts.phone ?? matchMedia("(max-width: 900px)").matches, set = phone ? PHONE : DESKTOP;
  const canvas = document.createElement("canvas");
  canvas.className = "wash-canvas"; canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d", { alpha: true });
  stage.prepend(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, foam = null;
  const frames = new Array(set.count).fill(null), photos = {};
  let loaded = 0, total = set.count + PHOTOS.length, running = false, raf = 0, visible = false, warm = false, stopped = false, lastKey = "";
  const progress = () => { if (typeof opts.progress === "number") return opts.progress; const r = wrap.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp01(-r.top / span) : 0; };
  const tick = () => { loaded++; say(Math.round(loaded / total * 100)); lastKey = ""; };

  // Photos first (the first two beats), then the film frames in order, a few at a time.
  const ready = Promise.all(PHOTOS.map(n => load(`media/${n}${set.pair}.webp`).then(im => { photos[n] = im; tick(); })));
  ready.then(async () => {
    for (let i = 0; i < set.count && !stopped; i += 4) {
      await Promise.all([0, 1, 2, 3].map(k => i + k < set.count ? load(`${set.dir}f${String(i + k + 1).padStart(3, "0")}.webp`).then(im => { frames[i + k] = im; tick(); }) : null));
    }
  });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    foam = foamStrip(Math.round(h * dpr));
    lastKey = "";
  }

  // The picture's frame: on wide screens the half of the stage opposite the words (they swap each package);
  // on phones the top of the screen, with the words below.
  function frameRect(side) {
    const m = Math.round(W * 0.04);
    if (phone || W / H < 1) return { x: 0, y: 0, w: W, h: Math.round(H * 0.56) };
    const w = Math.round(W * 0.52), h = Math.round(H * 0.8), y = Math.round((H - h) / 2);
    return { x: side > 0 ? W - w - m : m, y, w, h };
  }
  function cover(im, r, focusX = 0.5, focusY = 0.5) {
    const s = Math.max(r.w / im.width, r.h / im.height), w = im.width * s, h = im.height * s;
    ctx.drawImage(im, r.x - (w - r.w) * focusX, r.y - (h - r.h) * focusY, w, h);
  }
  // Before, then after revealed to the left of a wobbling line, with the foam riding the line.
  function wipe(before, after, r, t, time) {
    if (!before || !after) return;
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    cover(before, r);
    if (t <= 0) { ctx.restore(); return; }
    const lineX = r.x + r.w * (t * 1.12 - 0.06), amp = r.w * 0.025;
    ctx.save(); ctx.beginPath(); ctx.moveTo(r.x, r.y);
    for (let y = r.y; y <= r.y + r.h; y += 8) ctx.lineTo(lineX + Math.sin(y / 38 + time * 2.4) * amp + Math.sin(y / 11 - time * 3.1) * amp * 0.4, y);
    ctx.lineTo(r.x, r.y + r.h); ctx.closePath(); ctx.clip();
    cover(after, r);
    ctx.restore();
    if (t < 1) {
      const fw = r.w * 0.17;
      // A wet, slightly darker band just ahead of the foam, then the foam itself.
      const wet = ctx.createLinearGradient(lineX, 0, lineX + fw * 0.9, 0);
      wet.addColorStop(0, "rgba(0,20,40,0.28)"); wet.addColorStop(1, "rgba(0,20,40,0)");
      ctx.fillStyle = wet; ctx.fillRect(lineX, r.y, fw * 0.9, r.h);
      const g = ctx.createLinearGradient(lineX - fw, 0, lineX + fw * 0.35, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.6, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(lineX - fw, r.y, fw * 1.35, r.h);
      ctx.globalAlpha = 0.95;
      const scroll = ((time * 30) % foam.height) | 0;
      ctx.drawImage(foam, 0, scroll, foam.width, foam.height - scroll, lineX - fw * 0.95, r.y, fw * 1.3, r.h * (1 - scroll / foam.height));
      ctx.drawImage(foam, 0, 0, foam.width, scroll, lineX - fw * 0.95, r.y + r.h * (1 - scroll / foam.height), fw * 1.3, r.h * scroll / foam.height);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function paint(now) {
    const p = progress(), time = now / 1000;
    // Which beat, and how far through its move. The frame's side follows the package copy: left, right, left.
    const b1 = 1 - smooth(0.31, 0.36, p), b2 = smooth(0.31, 0.36, p) * (1 - smooth(0.64, 0.69, p)), b3 = smooth(0.64, 0.69, p);
    const idx = Math.min(set.count - 1, Math.floor(smooth(0.69, 1, p) * (set.count - 1)));
    const t1 = clamp01(p / 0.3), t2 = clamp01((p - 0.37) / 0.26);
    const busy = (t1 > 0 && t1 < 1 && b1 > 0) || (t2 > 0 && t2 < 1 && b2 > 0);
    const key = [p.toFixed(4), loaded, busy ? now | 0 : 0].join("|");
    if (key === lastKey) return;
    lastKey = key;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (b1 > 0.001) { ctx.globalAlpha = b1; wipe(photos.ext_before, photos.ext_after, frameRect(1), t1, time); }
    if (b2 > 0.001) { ctx.globalAlpha = b2; wipe(photos.int_before, photos.int_after, frameRect(-1), t2, time); }
    if (b3 > 0.001) {
      ctx.globalAlpha = b3;
      let im = frames[idx]; for (let i = idx; i >= 0 && !im; i--) im = frames[i];
      if (im) { const r = frameRect(1); ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); cover(im, r, 0.5, 0.45); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    if (!warm && photos.ext_after) { warm = true; stage.classList.add("wash-on"); if (opts.onFrame) opts.onFrame(); }
  }
  function frame(now) { raf = running ? requestAnimationFrame(frame) : 0; paint(now); }
  const run = () => { if (visible && !document.hidden && !running) { running = true; raf = requestAnimationFrame(frame); } };
  const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; visible ? run() : halt(); }, { rootMargin: "20% 0px" });
  io.observe(wrap);
  const onHide = () => (document.hidden ? halt() : run());
  document.addEventListener("visibilitychange", onHide);
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  run();
  return () => { stopped = true; halt(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onHide); stage.classList.remove("wash-on"); canvas.remove(); };
}
