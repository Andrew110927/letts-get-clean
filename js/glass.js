// The first screen opens through a rain-beaded windshield. The hero film (or its poster, until the film has a frame) is
// refracted through a sheet of glass with water drops on it, then a squeegee line sweeps across and the glass goes clear,
// drop by drop, to the plain film underneath; the canvas then removes itself. Real refraction, not a smear: the drops are
// a height field, its normal bends a view ray through the glass thickness, and red, green and blue bend by slightly different
// amounts so the drop edges fringe. js/motion.js loads this on wide screens with motion allowed, once the page has loaded.
// Decorative only: hidden from screen readers, nothing underneath changes.
const BASE_EDGE = 1200;
const SETTINGS = { scale: 54, relief: 1.25, thickness: 70, dispersion: 0.12, specular: 0.28, seed: 7 };
const HOLD = 0.7, SWEEP = 1.7; // seconds: the rainy pause, then the squeegee

const VERT = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform vec2 uResolution, uImageRes, uFocus;
uniform float uScale, uRelief, uThickness, uDispersion, uSpecular, uSeed, uWipe;
const float IOR = 1.50;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Rain: one drop per cell, placed and sized by noise, rounded by a smoothstep.
float height(vec2 cell) {
  vec2 seed2 = vec2(uSeed, uSeed * 1.37);
  vec2 id = floor(cell), f = fract(cell);
  vec2 o = vec2(valueNoise(id + seed2), valueNoise(id + seed2 + 7.3));
  float d = length(f - mix(vec2(0.25), vec2(0.75), o));
  float r = 0.18 + 0.22 * valueNoise(id * 1.7 + seed2);
  return smoothstep(r, 0.0, d);
}
// The film covers the frame (object-fit: cover), and reads past its edge are mirrored, never smeared.
vec2 coverUv(vec2 frag) {
  float fa = uResolution.x / uResolution.y, ia = uImageRes.x / uImageRes.y;
  vec2 uv = frag / uResolution;
  // uFocus is the CSS object-position, measured from the bottom-left as GL does.
  if (fa > ia) uv.y = uv.y * (ia / fa) + (1.0 - ia / fa) * uFocus.y; else uv.x = uv.x * (fa / ia) + (1.0 - fa / ia) * uFocus.x;
  return 1.0 - abs(mod(uv, 2.0) - 1.0);
}
vec3 sampleAt(vec3 normal, vec2 frag, float ior) {
  vec3 incident = vec3(0.0, 0.0, -1.0);
  vec3 bent = refract(incident, normal, 1.0 / ior);
  if (dot(bent, bent) == 0.0) bent = incident;
  vec2 offset = bent.xy / max(abs(bent.z), 1e-4) * uThickness;
  return texture2D(uImage, coverUv(frag + offset)).rgb;
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  float cellPx = max(uScale, 2.0);
  vec2 cell = (frag - uResolution * 0.5) / cellPx;
  // The squeegee line leans like a blade; left of it the glass is clear (relief 0 returns the film untouched).
  float along = (frag.x + (uResolution.y - frag.y) * 0.22) / uResolution.x;
  float relief = uRelief * smoothstep(uWipe - 0.02, uWipe + 0.16, along);
  float e = 1.0 / cellPx;
  float hx = (height(cell + vec2(e, 0.0)) - height(cell - vec2(e, 0.0))) / (2.0 * e);
  float hy = (height(cell + vec2(0.0, e)) - height(cell - vec2(0.0, e))) / (2.0 * e);
  vec3 normal = normalize(vec3(-hx * relief, -hy * relief, 1.0));
  vec3 colour;
  if (uDispersion > 0.0) {
    float d = uDispersion * 0.06;
    colour.r = sampleAt(normal, frag, IOR - d).r;
    colour.g = sampleAt(normal, frag, IOR).g;
    colour.b = sampleAt(normal, frag, IOR + d).b;
  } else {
    colour = sampleAt(normal, frag, IOR);
  }
  colour += pow(max(0.0, 1.0 - normal.z), 5.0) * uSpecular;
  // A thin wet shine rides just behind the blade.
  colour += 0.10 * smoothstep(0.0, 0.025, along - uWipe + 0.03) * (1.0 - smoothstep(0.025, 0.06, along - uWipe + 0.03));
  gl_FragColor = vec4(colour, 1.0);
}`;
// object-position of the hero film and poster (index.html): 50% 38% from the top-left.
const FOCUS = [0.5, 1 - 0.38];

export function start(hero, opts = {}) {
  const media = hero.querySelector(".hero-media"), video = hero.querySelector("video"), still = hero.querySelector(".hero-still");
  if (!media) return null;
  const canvas = document.createElement("canvas");
  canvas.className = "rain-glass"; canvas.setAttribute("aria-hidden", "true");
  const attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false };
  const gl = canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs);
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const u = (n) => gl.getUniformLocation(prog, n);
  const U = { res: u("uResolution"), img: u("uImageRes"), scale: u("uScale"), relief: u("uRelief"), thick: u("uThickness"), disp: u("uDispersion"), spec: u("uSpecular"), seed: u("uSeed"), wipe: u("uWipe") };
  gl.uniform1i(u("uImage"), 0);
  gl.uniform1f(U.relief, SETTINGS.relief); gl.uniform1f(U.disp, SETTINGS.dispersion); gl.uniform2f(u("uFocus"), FOCUS[0], FOCUS[1]); gl.uniform1f(U.spec, SETTINGS.specular); gl.uniform1f(U.seed, SETTINGS.seed);

  let raf = 0, t0 = 0, done = false;
  function size() {
    const w = media.clientWidth, h = media.clientHeight;
    if (!w || !h) return false;
    const k = BASE_EDGE / Math.max(w, h);
    canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    // Lengths are design units against a 1200px long edge, so the pane looks the same at any size.
    const unit = Math.max(canvas.width, canvas.height) / BASE_EDGE;
    gl.uniform1f(U.scale, SETTINGS.scale * unit); gl.uniform1f(U.thick, SETTINGS.thickness * unit);
    return true;
  }
  const source = () => (video && video.readyState >= 2 && video.videoWidth ? video : (still && still.complete && still.naturalWidth ? still : null));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function frame(now) {
    if (done) return;
    raf = requestAnimationFrame(frame);
    const src = source();
    if (!src) return;
    if (!t0) { t0 = now; canvas.classList.add("on"); }
    const t = (now - t0) / 1000;
    const wipe = typeof opts.wipe === "number" ? opts.wipe : -0.25 + 1.55 * ease(Math.min(1, Math.max(0, (t - HOLD) / SWEEP)));
    gl.uniform1f(U.wipe, wipe);
    const iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight;
    gl.uniform2f(U.img, iw, ih);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (typeof opts.wipe !== "number" && t > HOLD + SWEEP + 0.1) finish();
  }
  function finish() {
    if (done) return;
    done = true; cancelAnimationFrame(raf);
    canvas.classList.remove("on");
    setTimeout(() => { const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext(); canvas.remove(); if (opts.onDone) opts.onDone(); }, 400);
  }
  if (!size()) return null;
  media.append(canvas);
  raf = requestAnimationFrame(frame);
  return finish;
}
