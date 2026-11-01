// The pointer, drawn twice: a dot pinned to it and a ring that lags behind on a lerp and grows over anything you can press.
// index.html loads this only with a fine pointer that can hover and motion allowed; it unmounts if either changes (a mouse
// unplugged from a tablet, a motion preference flipped). Additive: the system cursor stays, with its own hover, text and
// pointer states, and nothing here takes clicks or focus.
const FOLLOW = 0.14, RING = 36, DOT = 6, HOVER = 1.9, SETTLE = 0.22;
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button], [role=slider], .ba";

export function start() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)"), motion = matchMedia("(prefers-reduced-motion: no-preference)");
  let stop = null;
  const check = () => { if (fine.matches && motion.matches) { if (!stop) stop = mount(); } else if (stop) { stop(); stop = null; } };
  fine.addEventListener("change", check);
  motion.addEventListener("change", check);
  check();
  return () => { fine.removeEventListener("change", check); motion.removeEventListener("change", check); if (stop) stop(); stop = null; };
}

function mount() {
  const ring = document.createElement("div"), dot = document.createElement("div");
  ring.className = "cursor-ring"; dot.className = "cursor-dot";
  ring.setAttribute("aria-hidden", "true"); dot.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot); // the ring first, so the dot paints on top
  let x = -100, y = -100, rx = x, ry = y, s = 1, over = false, shown = false, raf = 0;
  const show = (on) => { shown = on; ring.classList.toggle("on", on); dot.classList.toggle("on", on); };
  const move = (e) => {
    x = e.clientX; y = e.clientY;
    const under = document.elementFromPoint(x, y);
    over = !!(under && under.closest(INTERACTIVE));
    if (!shown) { rx = x; ry = y; show(true); }
  };
  const leave = () => { over = false; show(false); };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    rx += (x - rx) * FOLLOW; ry += (y - ry) * FOLLOW;
    s += ((over ? HOVER : 1) - s) * SETTLE;
    ring.style.transform = `translate(${rx - RING / 2}px, ${ry - RING / 2}px) scale(${s.toFixed(3)})`;
    dot.style.transform = `translate(${x - DOT / 2}px, ${y - DOT / 2}px)`;
  };
  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  const onHide = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) frame(); };
  document.addEventListener("visibilitychange", onHide);
  frame();
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", onHide);
    ring.remove(); dot.remove();
  };
}
