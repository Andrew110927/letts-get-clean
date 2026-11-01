// The corridor: a passage built from eight real pictures of the four cars in the reels (their posters, and the Sonata's
// before and after photos), gliding toward a vanishing point on a 2D canvas. The walls are drawn as perspective slices of
// each picture, so the crops bend the way a real corridor would. On wide screens with motion allowed it loops every 20 s
// and sleeps off screen; phones and reduced motion get one still frame. index.html loads it when the band is near.
// The renderer is the "Corridor" (card-tunnel) template, ported as written; the host around it is ours.
const PICTURES = [
  "media/reel_poster.webp", "media/ext_after-720.webp", "media/reel4_poster.webp", "media/int_after-720.webp",
  "media/reel2_poster.webp", "media/ext_before-720.webp", "media/reel3_poster.webp", "media/int_before-720.webp"
];
const PARAMS = { cornerRadius: 1.5, padding: 6, shadowEnabled: false, tunnelSize: 90, cardLength: 55, gap: 10, depthFade: 45, direction: "forward", backgroundType: "color", background: "rgba(0,0,0,0)" };
const LOOP_SECONDS = 20, DPR_CAP = 2, START_T = 0.12;
const base = new URL("../", import.meta.url).href;

// ── Template helpers (card-tunnel engine, minified names kept) ──────────────────────────────────────────────────────
function We(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
function H(t, e, n) { const a = t[e]; return typeof a == "number" ? a : n; }
function he(t, e, n) { const a = t[e]; return typeof a == "string" ? a : n; }
function k5(t, e) { return Math.min(t, e) / 100; }
function G6(t, e, n) { const a = k5(t, e) * n; return { x: a, y: a, w: t - a * 2, h: e - a * 2 }; }
function Fm(t) { return "videoWidth" in t ? { w: t.videoWidth, h: t.videoHeight } : { w: t.width, h: t.height }; }
function Xa(t, e, n, a, r, o) {
  const c = Math.max(0, Math.min(o, a / 2, r / 2));
  if ((t.beginPath(), typeof t.roundRect == "function")) { t.roundRect(e, n, a, r, c); return; }
  (t.moveTo(e + c, n), t.arcTo(e + a, n, e + a, n + r, c), t.arcTo(e + a, n + r, e, n + r, c), t.arcTo(e, n + r, e, n, c), t.arcTo(e, n, e + a, n, c), t.closePath());
}
function Y6(t, e, n, a, r = 1, o = 0, c = 0) {
  const d = Math.max(n / t, a / e) * Math.max(r, 1e-4), h = n / d, f = a / d, p = (t - h) / 2, m = (e - f) / 2;
  return { sx: p * (1 + Math.max(-1, Math.min(1, o))), sy: m * (1 + Math.max(-1, Math.min(1, c))), sw: h, sh: f };
}
function qm(t, e, n, a) {
  (t.save(), Xa(t, e.x, e.y, e.w, e.h, n), t.clip());
  const r = 30 + ((a * 11) % 30);
  ((t.fillStyle = `hsl(230, 6%, ${r}%)`), t.fillRect(e.x, e.y, e.w, e.h), t.restore());
}
function Ds(t, e, n, a, r = {}) {
  if (n.w <= 0 || n.h <= 0) return;
  const o = r.alpha ?? 1;
  if (o <= 0) return;
  const c = e ? Fm(e) : null;
  if (!e || !c || c.w <= 0 || c.h <= 0) { (t.save(), (t.globalAlpha *= o), qm(t, n, a, 0), t.restore()); return; }
  const d = Y6(c.w, c.h, n.w, n.h, r.zoom, r.panX, r.panY);
  (t.save(), (t.globalAlpha *= o), Xa(t, n.x, n.y, n.w, n.h, a), t.clip(), t.drawImage(e, d.sx, d.sy, d.sw, d.sh, n.x, n.y, n.w, n.h), t.restore());
}
function Re(t, e, n, a, r, o = {}) {
  if (a.w <= 0 || a.h <= 0) return;
  const c = o.alpha ?? 1;
  if (c <= 0) return;
  const d = e ? Fm(e) : null, h = e && d && d.w > 0 && d.h > 0;
  (t.save(), (t.globalAlpha *= c), h ? Ds(t, e, a, r, { zoom: o.zoom, panX: o.panX, panY: o.panY }) : qm(t, a, r, n), t.restore());
}
// Frame start: clear, paint the background, and hand back the unit, content box and radius. Shadows are off and the
// background transparent for this page (the box behind the canvas paints it), so those branches are left out.
function He(t) {
  const { ctx: e, width: n, height: a, params: r } = t;
  try { ((e.imageSmoothingEnabled = !0), (e.imageSmoothingQuality = "high")); } catch {}
  (e.setTransform(1, 0, 0, 1, 0, 0), e.clearRect(0, 0, n, a), (e.fillStyle = he(r, "background", "#101014")), e.fillRect(0, 0, n, a));
  const c = k5(n, a);
  const h = c * H(r, "offsetX", 0), f = c * H(r, "offsetY", 0);
  return ((h || f) && e.translate(h, f), { u: c, content: G6(n, a, H(r, "padding", 6)), radius: c * H(r, "cornerRadius", 3), shadow: 0 });
}
function je(t, e) { return t.images[e % t.images.length] ?? null; }

// ── The template: card-tunnel ───────────────────────────────────────────────────────────────────────────────────────
const _i = new Map();
const Cj = 24e6;
let B0 = 0;
const cw = new WeakMap();
let Oj = 1;
function $j(t) { if (!t) return "ph"; let e = cw.get(t); return (e || ((e = Oj++), cw.set(t, e)), String(e)); }
let cr = null;
function zj(t, e, n) {
  const a = Math.max(2, Math.ceil(t * n)), r = Math.max(2, Math.ceil(e * n));
  if ((cr || (cr = Gm(a, r)), !cr)) return null;
  const o = cr.canvas;
  return (o.width < a || o.height < r ? ((o.width = Math.max(o.width, a)), (o.height = Math.max(o.height, r))) : (cr.ctx.setTransform(1, 0, 0, 1, 0, 0), cr.ctx.clearRect(0, 0, a, r)), cr);
}
function Gm(t, e) {
  let n;
  if (typeof OffscreenCanvas < "u") n = new OffscreenCanvas(t, e);
  else if (typeof document < "u") ((n = document.createElement("canvas")), (n.width = t), (n.height = e));
  else return null;
  const a = n.getContext("2d");
  return a ? { canvas: n, ctx: a } : null;
}
const TEMPLATE = {
  render(t) {
    const { ctx: e, t: n, width: a, height: r, params: o } = t,
      c = He(t),
      d = H(o, "tunnelSize", 90) / 100, h = (a / 2) * d, f = (r / 2) * d,
      p = Math.min(a, r), m = p * (H(o, "cardLength", 55) / 100),
      b = H(o, "gap", 10) / 100, y = m * (1 - b), _ = 2 * f * (1 - b), x = 2 * h * (1 - b),
      w = H(o, "depthFade", 45) / 100,
      E = he(o, "direction", "forward") === "forward" ? 1 : -1,
      T = a / 2, k = r / 2;
    let A = 1;
    try { const F = e.getTransform(); A = Math.hypot(F.a, F.b) || 1; } catch {}
    const C = Math.max(4, t.images.length), I = Math.max(1, Math.round(C / 4)),
      z = (F) => ((F % C) + C) % C,
      B = p * 0.18, O = p * 4.5, $ = E * n * m * C,
      L = [{ side: !0, s: -1, farAnchor: !1 }, { side: !0, s: 1, farAnchor: !0 }, { side: !1, s: -1, farAnchor: !1 }, { side: !1, s: 1, farAnchor: !0 }],
      X = Math.floor((B + $) / m) - 1, Y = Math.ceil((O + $) / m);
    for (let F = Y; F >= X; F--) {
      const Q = (F + 0.5) * m - $, P = Math.max(Q - y / 2, B), q = Q + y / 2;
      if (q <= P || P > O) continue;
      const W = We((Q - B) / (O - B)), V = (1 - w * Math.pow(W, 1.2)) * We((O - Q) / (m * 0.9));
      if (V <= 0.004) continue;
      const K = p / Math.max(B, Q - y / 2),
        M = Math.max(0, Math.floor(T - h * K)), U = Math.max(0, Math.floor(k - f * K)),
        N = Math.min(a, Math.ceil(T + h * K)) - M, j = Math.min(r, Math.ceil(k + f * K)) - U,
        Z = V < 0.99 && N > 0 && j > 0 ? zj(N, j, A) : null,
        ne = Z ? Z.ctx : e;
      Z && ne.setTransform(A, 0, 0, A, -M * A, -U * A);
      for (let le = 0; le < 4; le++) {
        const te = L[le], se = te.side ? h : f, re = te.side ? a / 2 : r / 2;
        if ((p * se) / q > re + 4) continue;
        const fe = z(F + le * I), ge = je(t, fe), _e = te.side ? _ : x,
          be = p * se * (1 / P - 1 / q), Ee = (p * _e) / Math.min(P, q),
          ye = Math.max(be / y, Ee / _e) * A, ke = Math.max(y, _e),
          Se = Math.min(2048, Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, ke * ye))))) / ke,
          $e = Math.max(8, Math.round(y * Se)), Fe = Math.max(8, Math.round(_e * Se)),
          Ge = te.side ? $e : Fe, Ze = te.side ? Fe : $e, Xe = c.radius * Se;
        let bt = null;
        const Ae0 = `${$j(ge)}|${fe}|${Ge}x${Ze}|${Math.round(Xe)}`;
        let Qe = _i.get(Ae0);
        if (Qe) (_i.delete(Ae0), _i.set(Ae0, Qe));
        else {
          const Be = Gm(Ge, Ze);
          if (Be)
            for (Re(Be.ctx, ge, fe, { x: 0, y: 0, w: Ge, h: Ze }, Xe), Qe = { ...Be, px: Ge * Ze }, _i.set(Ae0, Qe), B0 += Qe.px; B0 > Cj && _i.size > 1;) {
              const vt = _i.keys().next().value;
              ((B0 -= _i.get(vt).px), _i.delete(vt));
            }
        }
        bt = Qe ?? null;
        if (!bt) {
          const Ae = p / Q;
          (ne.save(), ne.translate(T + (te.side ? te.s * se * Ae : 0), k + (te.side ? 0 : te.s * se * Ae)));
          const Qe2 = (te.side ? y : _e) * Ae, Be = (te.side ? _e : y) * Ae;
          (Re(ne, ge, fe, { x: -Qe2 / 2, y: -Be / 2, w: Qe2, h: Be }, c.radius, { alpha: Z ? 1 : V }), ne.restore());
          continue;
        }
        const ft = Ge, yt = Ze, Jt = (P - (Q - y / 2)) / y, Yt = 14;
        let ot = Math.min(96, Math.max(4, Math.round(be / Yt)));
        const Ct = Math.min(Ee, 2.5 * Math.max(a, r));
        let Me = Math.min(48, Math.max(2, Math.round(Ct / Yt)));
        const qe = 1600;
        if (ot * Me > qe) { const Ae = Math.sqrt(qe / (ot * Me)); ((ot = Math.max(4, Math.floor(ot * Ae))), (Me = Math.max(2, Math.floor(Me * Ae)))); }
        (ne.save(), Z || (ne.globalAlpha *= V));
        const ut = (Ae) => (te.farAnchor ? q - (Ae / ot) * (q - P) : P + (Ae / ot) * (q - P)),
          nt = (Ae) => (te.farAnchor ? (Ae / ot) * (1 - Jt) : Jt + (Ae / ot) * (1 - Jt)),
          ct = (Ae, Qe) => { const Be = p / ut(Qe); return te.side ? T + te.s * se * Be : T + (Ae / Me - 0.5) * _e * Be; },
          wt = (Ae, Qe) => { const Be = p / ut(Qe); return te.side ? k + (Ae / Me - 0.5) * _e * Be : k + te.s * se * Be; },
          At = (1 - Jt) / ot;
        for (let Ae = 0; Ae < ot; Ae++) {
          const Qe = nt(Ae);
          for (let Be = 0; Be < Me; Be++) {
            const vt = ct(Be, Ae), Ht = wt(Be, Ae),
              St = te.side ? ct(Be, Ae + 1) : ct(Be + 1, Ae), Et = te.side ? wt(Be, Ae + 1) : wt(Be + 1, Ae),
              zt = te.side ? ct(Be + 1, Ae) : ct(Be, Ae + 1), sn = te.side ? wt(Be + 1, Ae) : wt(Be, Ae + 1),
              Zt = St - vt, on = Et - Ht, is = zt - vt, ys = sn - Ht, Ns = vt + Zt + is, Ps = Ht + on + ys;
            if (Math.max(vt, St, zt, Ns) < -2 || Math.min(vt, St, zt, Ns) > a + 2 || Math.max(Ht, Et, sn, Ps) < -2 || Math.min(Ht, Et, sn, Ps) > r + 2) continue;
            const Yn = te.side ? At * ft : ft / Me, Ls = te.side ? yt / Me : At * yt,
              Mn = te.side ? Qe * ft : (Be / Me) * ft, Wn = te.side ? (Be / Me) * yt : Qe * yt,
              an = Math.hypot(Zt, on) || 1, Tt = Math.hypot(is, ys) || 1, Un = Yn / an, _s = Ls / Tt,
              xs = te.side ? Ae === 0 : Be === 0, Ka = te.side ? Ae === ot - 1 : Be === Me - 1,
              Js = te.side ? Be === 0 : Ae === 0, Zs = te.side ? Be === Me - 1 : Ae === ot - 1,
              Qs = xs ? 0 : Un, Us = Ka ? 0 : Un, Vn = Js ? 0 : _s, Is = Zs ? 0 : _s;
            (ne.save(), ne.transform(Zt / Yn, on / Yn, is / Ls, ys / Ls, vt, Ht),
              ne.drawImage(bt.canvas, Mn - Qs, Wn - Vn, Yn + Qs + Us, Ls + Vn + Is, -Qs, -Vn, Yn + Qs + Us, Ls + Vn + Is), ne.restore());
          }
        }
        ne.restore();
      }
      Z && (e.save(), (e.globalAlpha *= V), e.drawImage(Z.canvas, 0, 0, Math.ceil(N * A), Math.ceil(j * A), M, U, Math.ceil(N * A) / A, Math.ceil(j * A) / A), e.restore());
    }
  }
};

// ── Host ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function load(src) {
  return new Promise((ok) => { const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => ok(undefined); im.src = base + src; });
}

export function start(box, opts = {}) {
  const canvas = box.querySelector("canvas") || box.appendChild(document.createElement("canvas"));
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const lite = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 4);
  const loop = opts.loop ?? (matchMedia("(prefers-reduced-motion: no-preference)").matches && matchMedia("(min-width: 901px)").matches && !lite);
  let images = [], t = typeof opts.t === "number" ? opts.t : START_T, last = 0, raf = 0, visible = false, stopped = false;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(box.clientWidth * dpr); canvas.height = Math.round(box.clientHeight * dpr);
  };
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    TEMPLATE.render({ ctx, t, width: canvas.width, height: canvas.height, params: PARAMS, images, background: null });
    box.classList.add("on"); box.dataset.draws = (+box.dataset.draws || 0) + 1;
  };
  const tick = (now) => {
    raf = 0;
    if (stopped || !visible || document.hidden) return;
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t = (t + dt / LOOP_SECONDS) % 1;
    draw();
  };
  const run = () => { if (loop && !raf && visible && !document.hidden && images.length) { last = 0; raf = requestAnimationFrame(tick); } };
  const onHide = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : run());
  document.addEventListener("visibilitychange", onHide);
  const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) run(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: "10% 0px" });
  io.observe(box);
  const ro = new ResizeObserver(() => { resize(); if (images.length) draw(); });
  ro.observe(box);
  resize();
  Promise.all(PICTURES.map(load)).then((ims) => {
    if (stopped) return;
    images = ims;
    draw();
    run();
  });
  return () => { stopped = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onHide); };
}
