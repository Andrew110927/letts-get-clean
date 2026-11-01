// Foam over the hero film: soap bubbles drift up the driveway, lean away from the pointer and pop when clicked, around one
// big water droplet that bends the film behind it like a lens, follows the pointer and pops into foam when clicked.
// Three.js r172 from vendor/. js/motion.js loads this only on wide screens with motion allowed and data saver off,
// and it sleeps whenever the hero is off screen or the tab is hidden. Purely decorative: hidden from screen readers.
import { WebGLRenderer, Scene, PerspectiveCamera, IcosahedronGeometry, ShaderMaterial, InstancedMesh, InstancedBufferAttribute, Object3D, Vector2, Vector3, Vector4, DynamicDrawUsage, Mesh, TextureLoader, VideoTexture } from "../vendor/three.module.min.js";

const COUNT = 24;
const FOV = 35, CAM_Z = 10;
const POP_TIME = 0.22;

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aFade;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vSeed;
  varying float vFade;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    vSeed = aSeed;
    vFade = aFade;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vSeed;
  varying float vFade;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float facing = clamp(dot(n, v), 0.0, 1.0);
    // A bubble is nearly invisible face-on and bright at its edge.
    float rim = pow(1.0 - facing, 1.8);
    // Thin-film colour: the hue shifts with the viewing angle and swirls slowly, like soap.
    float swirl = facing * 2.2 + n.y * 0.6 + n.x * 0.3 + vSeed + uTime * 0.06;
    vec3 film = 0.55 + 0.45 * cos(6.28318 * (swirl + vec3(0.0, 0.33, 0.67)));
    vec3 color = mix(film, uTint, 0.3);
    // Two window reflections: a bright one up and to the left, a faint one low and to the right.
    vec3 h1 = normalize(normalize(vec3(-0.45, 0.65, 0.6)) + v);
    vec3 h2 = normalize(normalize(vec3(0.5, -0.55, 0.65)) + v);
    float spec = pow(max(dot(n, h1), 0.0), 120.0) * 1.2 + pow(max(dot(n, h2), 0.0), 60.0) * 0.25;
    float alpha = clamp((rim * 0.85 + 0.035 + spec) * vFade, 0.0, 1.0);
    gl_FragColor = vec4(min(color * (0.35 + rim) + spec, vec3(1.0)), alpha);
  }
`;

// The droplet samples the hero film at its own place on screen, bent by its surface, so it reads as a glass lens over the
// real footage. The film texture holds raw sRGB values and the shader writes them straight out, so colours match the video.
const dropVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const dropFragment = /* glsl */ `
  uniform sampler2D uFilm;
  uniform vec2 uRes;
  uniform vec4 uCrop;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  // Screen position to film texture position, matching the video's object-fit: cover and object-position 50% 38%.
  vec2 filmUv(vec2 s) { return uCrop.xy + clamp(s, 0.0, 1.0) * uCrop.zw; }
  void main() {
    vec3 n = normalize(vNormal), v = normalize(vView);
    float facing = clamp(dot(n, v), 0.0, 1.0);
    float rim = pow(1.0 - facing, 1.6);
    vec2 s = gl_FragCoord.xy / uRes;
    // A water lens: the film behind bends outward toward the edge, and the edge mirrors a squeezed copy of the scene.
    vec3 through = texture2D(uFilm, filmUv(s - n.xy * (0.06 + 0.1 * rim))).rgb;
    vec3 mirror = texture2D(uFilm, filmUv(vec2(s.x, 1.0 - s.y) + n.xy * 0.2)).rgb;
    float swirl = facing * 2.4 + n.y * 0.8 + uTime * 0.08;
    vec3 film = 0.55 + 0.45 * cos(6.28318 * (swirl + vec3(0.0, 0.33, 0.67)));
    float spec = pow(max(dot(n, normalize(normalize(vec3(-0.45, 0.65, 0.6)) + v)), 0.0), 140.0) * 1.4
               + pow(max(dot(n, normalize(normalize(vec3(0.6, -0.4, 0.7)) + v)), 0.0), 40.0) * 0.25;
    vec3 col = mix(through * 1.06, mirror * 0.6, rim * 0.35);
    col = mix(col, mix(film, uTint, 0.25), rim * 0.55) + spec;
    gl_FragColor = vec4(min(col, vec3(1.0)), uFade);
  }
`;

// Returns a function that stops the foam and frees everything it made.
export function start(hero) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "foam";
  canvas.setAttribute("aria-hidden", "true");
  hero.querySelector(".hero-dim").before(canvas); // over the film, under the scroll-away dimming and the name

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
  camera.position.z = CAM_Z;
  const halfH = (z) => (CAM_Z - z) * Math.tan((FOV / 2) * Math.PI / 180); // half the visible height at depth z

  const geometry = new IcosahedronGeometry(1, 3);
  const seeds = new Float32Array(COUNT), fades = new Float32Array(COUNT).fill(1);
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
  const fadeAttr = new InstancedBufferAttribute(fades, 1).setUsage(DynamicDrawUsage);
  geometry.setAttribute("aFade", fadeAttr);
  const material = new ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    // The brand blue as plain sRGB numbers: this shader writes its colour straight to the screen.
    uniforms: { uTime: { value: 0 }, uTint: { value: new Vector3(0x29 / 255, 0xc8 / 255, 1) } },
  });
  const foam = new InstancedMesh(geometry, material, COUNT);
  foam.instanceMatrix.setUsage(DynamicDrawUsage);
  foam.frustumCulled = false; // the bubbles move every frame, so one stale bounding sphere would cull them wrongly
  scene.add(foam);

  // The droplet: drawn first (renderOrder) and writing depth, so foam behind it hides and foam in front of it shows.
  const film = document.getElementById("heroVid");
  const poster = new TextureLoader().load("media/hero_poster.webp", (t) => { if (dropMat.uniforms.uFilm.value === t) updateCrop(); });
  const filmTex = film ? new VideoTexture(film) : null;
  const dropGeo = new IcosahedronGeometry(1, 6);
  const dropMat = new ShaderMaterial({
    vertexShader: dropVertex, fragmentShader: dropFragment, transparent: true,
    uniforms: { uFilm: { value: poster }, uRes: { value: new Vector2(1, 1) }, uCrop: { value: new Vector4(0, 0, 1, 1) }, uTime: { value: 0 }, uFade: { value: 1 }, uTint: material.uniforms.uTint },
  });
  const drop = new Mesh(dropGeo, dropMat);
  drop.renderOrder = -1;
  scene.add(drop);
  const D = { x: 0, y: 0.1, z: 0.6, r: 1.15, fx: 0, fy: 0, pop: 0, grow: 1 };
  const buf = new Vector2();
  // Which part of the film shows on screen, the way the browser crops the video (cover, 50% 38%).
  function updateCrop() {
    const tex = dropMat.uniforms.uFilm.value, img = tex && tex.image;
    const sw = (img && (img.videoWidth || img.naturalWidth || img.width)) || 16, sh = (img && (img.videoHeight || img.naturalHeight || img.height)) || 9;
    const screen = aspect, src = sw / sh;
    const sx = screen > src ? 1 : screen / src, sy = screen > src ? src / screen : 1;
    dropMat.uniforms.uCrop.value.set(0.5 * (1 - sx), 1 - 0.38 * (1 - sy) - sy, sx, sy);
    renderer.getDrawingBufferSize(buf);
    dropMat.uniforms.uRes.value.copy(buf);
  }

  // Bubble state lives in plain arrays; nothing is allocated per frame.
  const B = Array.from({ length: COUNT }, (_, i) => ({ x: 0, y: 0, z: 0, r: 0, rise: 0, phase: 0, freq: 0, ox: 0, oy: 0, vx: 0, vy: 0, pop: 0, seed: (seeds[i] = Math.random()) }));
  let aspect = 1;
  function spawn(b, anywhere) {
    b.z = -4 + Math.random() * 5.5;
    b.r = 0.12 + Math.pow(Math.random(), 2.2) * 0.42;
    const hh = halfH(b.z), hw = hh * aspect;
    b.x = (Math.random() * 2 - 1) * hw * 0.95;
    b.y = anywhere ? (Math.random() * 2 - 1) * hh : -hh - b.r - Math.random() * hh * 0.5;
    b.rise = (0.22 + Math.random() * 0.25) * (1.15 - b.r);
    b.phase = Math.random() * Math.PI * 2;
    b.freq = 0.4 + Math.random() * 0.5;
    b.ox = b.oy = b.vx = b.vy = 0;
    b.pop = 0;
  }

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    D.x = halfH(D.z) * aspect * 0.5;
    if (typeof updateCrop === "function") updateCrop();
  }
  resize();
  B.forEach(b => spawn(b, true));

  // Pointer in normalised screen units (-1..1); far away until the pointer is over the hero.
  const pointer = { x: 9, y: 9 };
  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };
  const onLeave = () => { pointer.x = pointer.y = 9; };
  const projected = new Vector3();
  // A click on a bubble pops the front-most one under the pointer. Links and buttons keep their clicks.
  const onDown = (e) => {
    if (e.button !== 0 || e.target.closest("a,button,input,label,select,textarea")) return;
    onMove(e);
    // The droplet sits in front, so it gets the click first: it pops into a burst of foam and forms again a moment later.
    projected.set(D.x + D.fx, D.y + D.fy, D.z).project(camera);
    const ddx = (projected.x - pointer.x) * aspect, ddy = projected.y - pointer.y, dr = (D.r * D.grow) / halfH(D.z);
    if (!D.pop && D.grow >= 1 && ddx * ddx + ddy * ddy < dr * dr) {
      D.pop = 0.0001;
      for (let i = 0; i < 10; i++) {
        const b = B[i], a = (i / 10) * Math.PI * 2;
        spawn(b, true);
        b.z = D.z; b.x = D.x + D.fx + Math.cos(a) * D.r * 0.6; b.y = D.y + D.fy + Math.sin(a) * D.r * 0.6;
        b.r = 0.1 + Math.random() * 0.18; b.vx = Math.cos(a) * 2.2; b.vy = Math.sin(a) * 2.2;
      }
      return;
    }
    let hit = null, hitZ = -Infinity;
    for (const b of B) {
      if (b.pop) continue;
      projected.set(b.x + b.ox, b.y + b.oy, b.z).project(camera);
      const dx = (projected.x - pointer.x) * aspect, dy = projected.y - pointer.y;
      const rScreen = b.r / halfH(b.z);
      if (dx * dx + dy * dy < rScreen * rScreen && b.z > hitZ) { hit = b; hitZ = b.z; }
    }
    if (hit) hit.pop = 0.0001;
  };
  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave, { passive: true });
  hero.addEventListener("pointerdown", onDown);

  const dummy = new Object3D();
  let last = 0, time = 0, lastScroll = window.scrollY;
  function frame(now) {
    const dt = Math.min((now - (last || now)) / 1000, 0.05); // a long pause (tab away) resumes smoothly, not with a jump
    last = now;
    time += dt;
    material.uniforms.uTime.value = time;
    for (let i = 0; i < COUNT; i++) {
      const b = B[i], hh = halfH(b.z);
      b.y += b.rise * dt;
      // The pointer pushes nearby bubbles away; a spring brings them back to their own path.
      projected.set(b.x + b.ox, b.y + b.oy, b.z).project(camera);
      const dx = (projected.x - pointer.x) * aspect, dy = projected.y - pointer.y, d = Math.hypot(dx, dy), reach = 0.28;
      if (d < reach && d > 1e-4) { const f = (1 - d / reach) * 9 * dt; b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
      b.vx += -b.ox * 2.2 * dt; b.vy += -b.oy * 2.2 * dt;
      const damp = Math.exp(-3 * dt); b.vx *= damp; b.vy *= damp;
      b.ox += b.vx * dt; b.oy += b.vy * dt;
      // Fade in from below the frame, out near the top; a popped bubble swells and vanishes, then starts again.
      let fade = Math.min(1, (b.y + hh + b.r) / (hh * 0.5)) * Math.min(1, (hh - b.y) / (hh * 0.3));
      let swell = 1;
      if (b.pop) {
        b.pop += dt / POP_TIME;
        const p = Math.min(b.pop, 1);
        swell = 1 + 0.35 * (1 - (1 - p) * (1 - p));
        fade *= 1 - p;
        if (b.pop >= 1) spawn(b, false);
      }
      if (b.y - b.r > hh) spawn(b, false);
      fades[i] = Math.max(0, fade);
      const wob = Math.sin(time * b.freq * 2 + b.phase);
      dummy.position.set(b.x + b.ox + Math.sin(time * b.freq + b.phase) * 0.25, b.y + b.oy, b.z);
      dummy.scale.set(b.r * swell * (1 + wob * 0.04), b.r * swell * (1 - wob * 0.04), b.r * swell);
      dummy.updateMatrix();
      foam.setMatrixAt(i, dummy.matrix);
    }
    foam.instanceMatrix.needsUpdate = true;
    fadeAttr.needsUpdate = true;

    // The droplet bobs, breathes, drifts a little toward the pointer, and swirls faster while the page is scrolling.
    if (filmTex && dropMat.uniforms.uFilm.value !== filmTex && film.readyState >= 2) { dropMat.uniforms.uFilm.value = filmTex; updateCrop(); }
    const sy = window.scrollY, spin = Math.min(Math.abs(sy - lastScroll) * 0.01, 1.5);
    lastScroll = sy;
    dropMat.uniforms.uTime.value += dt * (1 + spin * 6);
    const near = pointer.x < 5, k = 1 - Math.exp(-2.5 * dt);
    D.fx += ((near ? pointer.x * halfH(D.z) * aspect * 0.18 : 0) - D.fx) * k;
    D.fy += ((near ? pointer.y * halfH(D.z) * 0.14 : 0) - D.fy) * k;
    let dropFade = 1, dropSwell = 1;
    if (D.pop) {
      D.pop += dt / POP_TIME;
      const p = Math.min(D.pop, 1);
      dropSwell = 1 + 0.25 * p; dropFade = 1 - p;
      if (D.pop >= 1) { D.pop = 0; D.grow = 0; dropFade = 0; }
    } else if (D.grow < 1) {
      D.grow = Math.min(1, D.grow + dt / 2.5);
      dropSwell = D.grow < 0.6 ? 0.001 : (D.grow - 0.6) / 0.4; // rests unseen for a beat, then forms again
      dropFade = dropSwell;
    }
    const breathe = Math.sin(time * 1.3) * 0.015, rr = D.r * dropSwell;
    drop.position.set(D.x + D.fx, D.y + D.fy + Math.sin(time * 0.8) * 0.12, D.z);
    drop.scale.set(rr * (1 + breathe), rr * (1 - breathe), rr);
    drop.visible = dropFade > 0.01;
    dropMat.uniforms.uFade.value = dropFade;
    renderer.render(scene, camera);
    if (!canvas.classList.contains("on")) canvas.classList.add("on");
  }

  // Only draw while the hero is on screen and the tab is visible.
  let onScreen = true, compiled = false;
  const setLoop = () => { const run = compiled && onScreen && !document.hidden; if (!run) last = 0; renderer.setAnimationLoop(run ? frame : null); };
  const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; setLoop(); });
  seen.observe(hero);
  const sized = new ResizeObserver(resize);
  sized.observe(hero);
  document.addEventListener("visibilitychange", setLoop);
  const lost = () => stop();
  canvas.addEventListener("webglcontextlost", lost);

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    renderer.setAnimationLoop(null);
    seen.disconnect(); sized.disconnect();
    document.removeEventListener("visibilitychange", setLoop);
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    hero.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("webglcontextlost", lost);
    geometry.dispose(); material.dispose(); foam.dispose();
    dropGeo.dispose(); dropMat.dispose(); poster.dispose(); if (filmTex) filmTex.dispose();
    renderer.dispose();
    canvas.remove();
  }
  // Build the shader before the first frame so the film never hitches when the foam appears.
  const begin = () => { compiled = true; if (!stopped) setLoop(); };
  renderer.compileAsync(scene, camera).then(begin, begin);
  return stop;
}
