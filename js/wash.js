// The wash: a white sedan drawn in code (no model download, nothing stock) on a studio floor behind the three package
// screens. Scrolling drives it: a foam line sweeps the body front to back and leaves gloss and water beads behind it
// (Exterior), the camera moves to the driver's window and the inside lights up (Interior), then the car dries to a
// showroom shine and turns slowly (The Full Detail). Mist and foam fly off the wash line, more when you scroll fast.
// Three.js r172 from vendor/. index.html imports this only with motion allowed and WebGL available, when the stage
// is near; it sleeps off screen and in hidden tabs. Decorative: the canvas is hidden from screen readers.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points, Shape, ExtrudeGeometry, BoxGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry, BufferGeometry, BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial,
  MeshBasicMaterial, ShaderMaterial, DirectionalLight, PointLight, PMREMGenerator, CanvasTexture, Color, Vector3,
  DoubleSide, DynamicDrawUsage, ACESFilmicToneMapping, MathUtils, Matrix4, Box3
} from "../vendor/three.module.min.js";

// A real car model, when Andrew drops one in: media/car.glb (glTF, front facing -Z as glTF models do, any size).
// Its paint takes the wash shader; glass, lamps and everything else keep their own materials.
const CAR_URL = new URL("../media/car.glb", import.meta.url).href;
// Which way the model's nose points in its own file: glTF convention is -z, Blender exports often come out +z.
const CAR_FRONT = "+z";

const LENGTH = 4.8, HALF = LENGTH / 2;
const BODY_WHITE = 0xF1F2F4, DIRT = 0xA89A82, GLASS_DUSTY = 0x7D7F80, GLASS_CLEAR = 0x0B1016;
const UP = new Vector3(0, 1, 0);
const clamp01 = (v) => MathUtils.clamp(v, 0, 1);
const smooth = (a, b, v) => MathUtils.smoothstep(v, a, b);

// Where the camera is at each point of the scroll: position, what it looks at, and how far the car sits off centre
// (positive = car on the right, so the words have the left). The copy swaps sides each package.
const KEYS = [
  [0.00, [7.0, 2.1, 8.6], [0.3, 0.6, 0], 0.48],
  [0.17, [4.0, 1.0, 7.6], [0.5, 0.55, 0], 0.5],
  [0.34, [-2.4, 1.1, 7.2], [-0.3, 0.6, 0], 0.45],
  [0.50, [-6.4, 1.9, 6.2], [-0.4, 0.8, 0], -0.6],
  [0.66, [-4.6, 1.7, 7.6], [-0.2, 0.8, 0], -0.55],
  [0.82, [7.6, 2.7, 8.4], [0, 0.6, 0], 0.3],
  [1.00, [9.2, 3.0, 8.4], [0, 0.6, 0], 0.28]
];

const GLSL_NOISE = /* glsl */ `
  float hash3(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

// The body paint: dirt and gloss are decided per pixel from where the wash line is, so one material does the whole wash.
function paintMaterial(uniforms) {
  const m = new MeshPhysicalMaterial({ color: BODY_WHITE, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj; uniform mat4 uToCar;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = (uToCar * modelMatrix * vec4(position, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uWipe, uBeads, uGloss, uTime, uKeyOn; uniform vec3 uDirt, uKey; varying vec3 vObj;
        ${GLSL_NOISE}
        float washT(vec3 o) { return (${HALF.toFixed(2)} - o.x) / ${LENGTH.toFixed(2)}; }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        if (uKeyOn > 0.5) {
          vec3 c = diffuseColor.rgb;
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / max(mx, 1e-4);
          float h = mx == mn ? 0.0 : mx == c.r ? mod((c.g - c.b) / (mx - mn), 6.0) : mx == c.g ? (c.b - c.r) / (mx - mn) + 2.0 : (c.r - c.g) / (mx - mn) + 4.0;
          float dh = abs(h - uKey.x); dh = min(dh, 6.0 - dh);
          float near = (1.0 - smoothstep(0.5, 1.1, dh)) * smoothstep(0.08, 0.2, sat);
          float lum = dot(c, vec3(0.3, 0.59, 0.11));
          diffuseColor.rgb = mix(c, vec3(0.92) * clamp(lum / max(uKey.y, 1e-3), 0.25, 1.3), near);
        }
        float t = washT(vObj);
        float cleanHere = 1.0 - smoothstep(uWipe - 0.07, uWipe + 0.07, t);
        // Road grime: blotchy, and heaviest low on the body where the wheels throw it.
        float grime = vnoise(vObj * 3.1) * 0.6 + vnoise(vObj * 9.0) * 0.4;
        float low = 1.0 - smoothstep(0.15, 1.15, vObj.y);
        float splash = smoothstep(0.32, 0.9, grime + low * 0.5);
        vec3 dirty = mix(diffuseColor.rgb * 0.8, uDirt, splash * 0.88);
        // The foam line itself: a bright bubbly band that moves with the wash.
        float band = smoothstep(0.15, 0.0, abs(t - uWipe)) * step(0.001, uWipe) * step(uWipe, 0.999);
        float foam = band * smoothstep(0.3, 0.72, vnoise(vObj * 15.0 + vec3(0.0, uTime * 0.8, uTime * 0.3)));
        diffuseColor.rgb = mix(dirty, diffuseColor.rgb, cleanHere);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.92);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.92, mix(0.3, 0.12, uGloss), cleanHere);`)
      .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
        // Water beads: just behind the wash the paint is covered in small domes that catch the light; they dry away later.
        if (uBeads > 0.001) {
          vec3 cell = floor(vObj * 24.0), fr = fract(vObj * 24.0) - 0.5;
          vec3 jit = vec3(hash3(cell), hash3(cell + 7.1), hash3(cell + 3.7)) * 0.5 - 0.25;
          vec3 d = fr - jit;
          float r = 0.17 + 0.15 * hash3(cell + 1.3);
          float dome = smoothstep(r, r * 0.5, length(d)) * step(0.35, hash3(cell + 5.5)) * uBeads * cleanHere;
          normal = normalize(normal + vec3(d.x, d.y, d.z * 0.5) * dome * 3.5);
        }`)
      .replace("#include <clearcoat_normal_fragment_begin>", "vec3 clearcoatNormal = normal;")
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
        material.clearcoat *= cleanHere;
        material.clearcoatRoughness = mix(0.3, 0.05, uGloss);`);
  };
  m.customProgramCacheKey = () => "lgc-paint";
  return m;
}

// A side profile (x along the car, y up) extruded across the width with rounded edges.
function profile(points, width, bevel) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 8 });
  g.translate(0, 0, -width / 2);
  return g;
}

function buildCar(paint, glass, interior) {
  const car = new Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); car.add(m); return m; };
  // Body up to the belt line.
  add(profile([[2.3, 0.52], [2.46, 0.64], [2.36, 0.8], [1.5, 0.86], [0.8, 0.95], [0.4, 1.0], [-1.4, 1.03], [-2.2, 0.98], [-2.44, 0.76], [-2.3, 0.52]], 1.78, 0.17), paint);
  // The glass house, one tinted shell, and a painted roof on top of it.
  add(profile([[0.75, 0.97], [0.12, 1.4], [-0.95, 1.43], [-1.72, 1.08], [-1.45, 0.99]], 1.44, 0.07), glass);
  const roof = add(new BoxGeometry(1.1, 0.06, 1.46), paint, -0.4, 1.435, 0);
  roof.rotation.z = -0.03;
  // Inside: seats, a dash and a dome light. Dark until the Interior screen lights it.
  [[-0.2, 0.86, 0.4], [-0.2, 0.86, -0.4], [-1.05, 0.86, 0]].forEach(([x, y, z], i) => add(new BoxGeometry(0.5, 0.46, i === 2 ? 1.2 : 0.46), interior.seat, x, y, z));
  add(new BoxGeometry(0.4, 0.2, 1.4), interior.dash, 0.5, 1.0, 0);
  car.add(interior.lamp);
  interior.lamp.position.set(-0.3, 1.3, 0);
  // Wheels: tyre, rim and a dark arch on the body side.
  const tyre = new TorusGeometry(0.32, 0.11, 10, 28), rim = new CylinderGeometry(0.24, 0.24, 0.24, 20);
  rim.rotateX(Math.PI / 2);
  const rubber = new MeshStandardMaterial({ color: 0x15171A, roughness: 0.95 }), metal = new MeshStandardMaterial({ color: 0xC9CDD3, roughness: 0.3, metalness: 0.9 }), dark = new MeshStandardMaterial({ color: 0x0A0B0D, roughness: 0.9 });
  const spoke = new BoxGeometry(0.3, 0.05, 0.03);
  for (const x of [1.55, -1.5]) for (const z of [0.76, -0.76]) {
    add(tyre, rubber, x, 0.43, z);
    add(rim, metal, x, 0.43, z);
    for (let i = 0; i < 5; i++) add(spoke, metal, x, 0.43, z + Math.sign(z) * 0.12).rotation.z = i * Math.PI * 0.4;
  }
  // Lights, grille and mirrors.
  const lamp = new MeshPhysicalMaterial({ color: 0xE8F0F8, roughness: 0.1, clearcoat: 1, emissive: 0xBFE4FF, emissiveIntensity: 0 });
  const tail = new MeshPhysicalMaterial({ color: 0x8A0F18, roughness: 0.15, clearcoat: 1, emissive: 0xFF2A33, emissiveIntensity: 0 });
  [0.6, -0.6].forEach(z => { add(new BoxGeometry(0.1, 0.12, 0.5), lamp, 2.4, 0.72, z); add(new BoxGeometry(0.08, 0.12, 0.44), tail, -2.4, 0.9, z); });
  add(new BoxGeometry(0.08, 0.16, 1.0), dark, 2.44, 0.54, 0);
  [0.95, -0.95].forEach(z => add(new BoxGeometry(0.14, 0.09, 0.2), paint, 0.55, 1.06, z));
  return { car, lamp, tail };
}

// The studio: soft panels above and beside the car, baked once into reflections.
function studio(renderer) {
  const room = new Scene();
  room.background = new Color(0x080A0E);
  const panel = (w, h, pos, rot, bright) => { const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(bright, bright, bright), side: DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); room.add(m); };
  panel(9, 3.5, [0, 5, 0], [Math.PI / 2, 0, 0], 5);
  panel(2.2, 9, [-6, 2.2, 0], [0, Math.PI / 2, 0], 2.2);
  panel(2.2, 9, [6, 2.2, 0], [0, Math.PI / 2, 0], 2.2);
  panel(12, 1.2, [0, 1.6, -7], [0, 0, 0], 1.6);
  panel(12, 0.8, [0, 1.2, 7], [0, 0, 0], 0.9);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  return env;
}

function contactShadow() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d"), g = ctx.createRadialGradient(128, 64, 10, 128, 64, 120);
  g.addColorStop(0, "rgba(0,0,0,0.8)"); g.addColorStop(0.5, "rgba(0,0,0,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.scale(1, 0.5); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const m = new Mesh(new PlaneGeometry(6.4, 3.4), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 2;
  return m;
}

// The floor is the page's own colour, so the canvas has no edge; near the car it lets a dim mirror image through.
function floorMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(0x07080B) }, uAlpha: { value: 0.74 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uAlpha; varying vec3 vW;
      void main(){ float a = mix(uAlpha, 1.0, smoothstep(2.2, 7.5, length(vW.xz))); gl_FragColor = vec4(uColor, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment> }`,
    transparent: true, depthWrite: false, toneMapped: false
  });
}

// Mist and foam: points born on the wash line that drift up and out, more and wider when the page scrolls fast.
function mist(count) {
  const pos = new Float32Array(count * 3), life = new Float32Array(count), size = new Float32Array(count), vel = new Float32Array(count * 3), age = new Float32Array(count);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage));
  geo.setAttribute("aLife", new BufferAttribute(life, 1).setUsage(DynamicDrawUsage));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  const mat = new ShaderMaterial({
    uniforms: { uScale: { value: 300 }, uTint: { value: new Color(0x29C8FF) } },
    vertexShader: /* glsl */ `attribute float aLife, aSize; varying float vLife;
      uniform float uScale;
      void main(){ vLife = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying float vLife; uniform vec3 uTint;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * smoothstep(0.0, 0.15, vLife) * smoothstep(1.0, 0.55, vLife);
        gl_FragColor = vec4(mix(vec3(1.0), uTint, 0.3 * d), a * 0.42); }`,
    transparent: true, depthWrite: false
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  let next = 0;
  for (let i = 0; i < count; i++) { life[i] = 2; size[i] = 0.09 + Math.random() * 0.16; }
  return {
    points,
    emit(x, y, z, spread, up) {
      const i = next++ % count;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * spread; vel[i * 3 + 1] = up + Math.random() * 0.4; vel[i * 3 + 2] = Math.sign(z || Math.random() - 0.5) * spread * (0.4 + Math.random() * 0.6);
      age[i] = 0; life[i] = 0;
    },
    step(dt) {
      for (let i = 0; i < count; i++) {
        if (life[i] >= 1) continue;
        age[i] += dt; life[i] = Math.min(1, age[i] / 1.1);
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3 + 1] -= 0.25 * dt;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aLife.needsUpdate = true;
    }
  };
}

// Loads media/car.glb if it exists. Sizes it to the drawn car's length, grounds and centres it, turns its nose to +x,
// and gives its paint the wash. Materials are told apart by name first, then by looks: glass is transparent, the
// paint is whatever covers the most of the car.
// The paint's hue and brightness: the most common hue among the coloured pixels of a small copy of the texture.
const hueOf = (c) => { const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); if (mx === mn) return 0; const d = mx - mn; return mx === c.r ? ((c.g - c.b) / d + 6) % 6 : mx === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4; };
function dominantColour(image) {
  try {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data, bins = new Array(24).fill(0), lums = new Array(24).fill(0);
    for (let i = 0; i < d.length; i += 4) {
      const col = new Color().setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, "srgb");
      const mx = Math.max(col.r, col.g, col.b), mn = Math.min(col.r, col.g, col.b);
      if (mx < 0.03 || (mx - mn) / mx < 0.15) continue;
      const b = Math.floor(hueOf(col) / 6 * 24) % 24; bins[b]++; lums[b] += 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
    }
    const top = bins.indexOf(Math.max(...bins));
    if (bins[top] < 40) return null;
    return { h: (top + 0.5) / 24 * 6, lum: lums[top] / bins[top] };
  } catch (e) { return null; }
}

async function loadRealCar(paint, glass, interior, uniforms) {
  const head = await fetch(CAR_URL, { method: "HEAD" }).catch(() => null);
  if (!head || !head.ok) return null;
  const { GLTFLoader } = await import("../vendor/GLTFLoader.js");
  const loader = new GLTFLoader();
  const buf = await (await fetch(CAR_URL)).arrayBuffer();
  if (new TextDecoder().decode(buf.slice(0, 4000)).includes("KHR_draco_mesh_compression")) {
    const { DRACOLoader } = await import("../vendor/DRACOLoader.js");
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath(new URL("../vendor/draco/", import.meta.url).href));
  }
  const gltf = await loader.parseAsync(buf, "");
  const root = gltf.scene;
  root.rotation.y = CAR_FRONT === "+z" ? Math.PI / 2 : -Math.PI / 2;
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root), size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
  const car = new Group(), inner = new Group();
  const k = LENGTH / Math.max(size.x, size.z);
  inner.add(root);
  inner.scale.setScalar(k);
  inner.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
  car.add(inner);
  // Which material is the paint: by name, else the one covering the most area (approximated by its meshes' bounds).
  const area = new Map(), byMat = new Map();
  root.traverse((m) => {
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.getSize(new Vector3()).multiplyScalar(k);
    const a = 2 * (b.x * b.y + b.y * b.z + b.x * b.z);
    mats.forEach((mat) => { area.set(mat, (area.get(mat) || 0) + a); if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(m); });
  });
  const named = (re) => [...byMat.keys()].filter(mat => re.test(mat.name || ""));
  const isGlass = (mat) => (mat.transparent && mat.opacity < 0.95) || (mat.transmission || 0) > 0.2;
  let body = named(/body|paint|carpaint|exterior|chassis|shell/i)[0];
  if (!body) body = [...area.entries()].filter(([mat]) => !isGlass(mat) && !/tire|tyre|wheel|rim|glass|window|light|interior|seat/i.test(mat.name || "")).sort((a, b) => b[1] - a[1])[0]?.[0];
  const lampMat = named(/head.?light|headlamp|lamp/i)[0], tailMat = named(/tail|brake|rear.?light/i)[0];
  let lamp = null, tail = null;
  const swap = (meshes, from, to) => meshes.forEach(m => { m.material = Array.isArray(m.material) ? m.material.map(x => x === from ? to : x) : to; });
  for (const [mat, meshes] of byMat) {
    if (mat === body) {
      const pm = paint.clone();
      pm.onBeforeCompile = paint.onBeforeCompile; pm.customProgramCacheKey = paint.customProgramCacheKey;
      // Keep the model's own detail maps; the colour goes white under them, like the Sonata.
      pm.map = mat.map || null; pm.normalMap = mat.normalMap || null; pm.roughnessMap = mat.roughnessMap || null; pm.metalnessMap = mat.metalnessMap || null;
      const key = pm.map ? dominantColour(pm.map.image) : (mat.color ? { h: hueOf(mat.color), lum: 0.3 * mat.color.r + 0.59 * mat.color.g + 0.11 * mat.color.b } : null);
      if (key) { uniforms.uKey.value.set(key.h, key.lum, 0); uniforms.uKeyOn.value = 1; }
      swap(meshes, mat, pm);
    } else if (isGlass(mat) || /glass|window|windshield|windscreen/i.test(mat.name || "")) {
      swap(meshes, mat, glass);
    } else if (mat === lampMat || mat === tailMat) {
      const lm = mat.clone(); lm.emissive = new Color(mat === lampMat ? 0xBFE4FF : 0xFF2A33); lm.emissiveIntensity = 0;
      swap(meshes, mat, lm);
      if (mat === lampMat) lamp = lm; else tail = lm;
    } else if (/seat|interior|dash|cabin|leather/i.test(mat.name || "") && mat.emissive) {
      // Interior parts glow with the dome light on the Interior screen.
      mat.emissive = new Color(0xFFB074); mat.emissiveIntensity = 0;
      interior.extra.push(mat);
    }
  }
  const blank = new MeshPhysicalMaterial({ visible: false });
  interior.lamp.position.set(0, 1.0, 0);
  car.add(interior.lamp);
  return { car, lamp: lamp || blank, tail: tail || blank };
}

function pose(p, out) {
  let k = 0;
  while (k < KEYS.length - 2 && p > KEYS[k + 1][0]) k++;
  const [p0, a0, t0, s0] = KEYS[k], [p1, a1, t1, s1] = KEYS[k + 1];
  const f = smooth(p0, p1, p);
  for (let i = 0; i < 3; i++) { out.pos[i] = MathUtils.lerp(a0[i], a1[i], f); out.target[i] = MathUtils.lerp(t0[i], t1[i], f); }
  out.side = MathUtils.lerp(s0, s1, f);
}

export function start(stage, opts = {}) {
  const wrap = stage.parentElement, still = stage.querySelector(".wash-still"), meter = stage.querySelector(".wash-load");
  const say = (n) => { if (meter) meter.textContent = n + "%"; };
  const phone = opts.phone ?? matchMedia("(max-width: 900px)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "wash-canvas"; canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !phone, powerPreference: "high-performance" });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(canvas);
  say(45);

  const scene = new Scene();
  scene.environment = studio(renderer);
  const camera = new PerspectiveCamera(32, 1, 0.1, 80);
  const uniforms = { uWipe: { value: 0 }, uBeads: { value: 0 }, uGloss: { value: 0 }, uTime: { value: 0 }, uDirt: { value: new Color(DIRT) }, uToCar: { value: new Matrix4() }, uKeyOn: { value: 0 }, uKey: { value: new Vector3() } };
  const paint = paintMaterial(uniforms);
  const glass = new MeshPhysicalMaterial({ color: GLASS_DUSTY, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.94, clearcoat: 0.4 });
  const interior = {
    seat: new MeshStandardMaterial({ color: 0x3A2E25, roughness: 0.8, emissive: 0xFFB074, emissiveIntensity: 0 }),
    dash: new MeshStandardMaterial({ color: 0x1C1A19, roughness: 0.6, emissive: 0x8FD8FF, emissiveIntensity: 0 }),
    lamp: new PointLight(0xFFC68A, 0, 3.5, 2),
    extra: []
  };
  let { car, lamp, tail } = buildCar(paint, glass, interior);
  let mirror = car.clone();
  mirror.scale.y = -1;
  scene.add(car, contactShadow());
  // Swap in the real model once it arrives; the drawn car shows until then.
  loadRealCar(paint, glass, interior, uniforms).then((real) => {
    if (!real || stopped) return;
    scene.remove(car, mirror);
    ({ car, lamp, tail } = real);
    car.rotation.y = spin;
    mirror = car.clone(); mirror.scale.y = -1; mirror.rotation.y = spin;
    scene.add(car); if (!fixed) scene.add(mirror);
    renderer.compile(scene, camera);
    if (opts.onModel) opts.onModel();
  }).catch((e) => { if (opts.onModel) opts.onModel(e); });
  const floor = new Mesh(new PlaneGeometry(60, 60), floorMaterial());
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1;
  const fixed = typeof opts.progress === "number";
  if (!fixed) scene.add(mirror, floor);
  const key = new DirectionalLight(0xFFF4E6, 2.2); key.position.set(4, 6, 5);
  const rim = new DirectionalLight(0x9FDFFF, 3.2); rim.position.set(-5, 3, -6);
  scene.add(key, rim);
  const fog = mist(phone ? 90 : 220);
  scene.add(fog.points);
  say(80);

  // Scroll position becomes progress (0 at the top of the first package, 1 at the end of the last) and speed.
  const view = { pos: [0, 0, 0], target: [0, 0, 0], side: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let stopped = false, progress = 0, speed = 0, lastP = 0, lastT = 0, burst = 0, running = false, raf = 0, visible = false, warm = false, spin = 0;
  const floorColor = floor.material.uniforms.uColor.value, pageColor = new Color();
  const dirV = new Vector3(), rightV = new Vector3(), camTarget = new Vector3();

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fog.points.material.uniforms.uScale.value = h * (phone ? 0.5 : 0.42) * renderer.getPixelRatio();
  }

  function readProgress() {
    const r = wrap.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? clamp01(-r.top / span) : 0;
  }

  function frame(now) {
    raf = running ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    progress = fixed ? opts.progress : readProgress();
    const v = Math.abs(progress - lastP) / dt;
    lastP = progress;
    speed += (v - speed) * Math.min(1, dt * 6);
    burst = clamp01(speed * 1.6);
    const p = progress, time = now / 1000;
    uniforms.uTime.value = time;

    // The three beats. Exterior: the wash sweeps the body, beads form behind it. Interior: glass clears, the cabin
    // lights. Full Detail: beads dry to a deep gloss, the lamps come on and the car turns.
    const wipe = clamp01(p / 0.3);
    uniforms.uWipe.value = wipe;
    uniforms.uBeads.value = smooth(0.06, 0.3, p) * (1 - smooth(0.66, 0.86, p));
    uniforms.uGloss.value = smooth(0.62, 0.9, p);
    const clear = smooth(0.34, 0.52, p), inside = smooth(0.38, 0.56, p) * (1 - smooth(0.7, 0.9, p) * 0.6);
    glass.color.setHex(GLASS_DUSTY).lerp(new Color(GLASS_CLEAR), clear);
    glass.roughness = MathUtils.lerp(0.55, 0.04, clear);
    glass.opacity = MathUtils.lerp(0.94, 0.62, clear);
    interior.seat.emissiveIntensity = inside * 0.9;
    interior.dash.emissiveIntensity = inside * 0.5;
    interior.lamp.intensity = inside * 2.6;
    interior.extra.forEach(m => { m.emissiveIntensity = inside * 0.6; });
    const lampsOn = smooth(0.84, 0.95, p);
    lamp.emissiveIntensity = lampsOn * 1.6;
    tail.emissiveIntensity = lampsOn * 1.2;
    spin = fixed ? (opts.spin || 0) : spin + dt * 0.22 * smooth(0.72, 0.9, p);
    car.rotation.y = mirror.rotation.y = spin;
    car.updateMatrixWorld();
    uniforms.uToCar.value.copy(car.matrixWorld).invert();
    // The floor follows the page colour, which melts from package to package underneath.
    if (!fixed) { pageColor.setStyle(getComputedStyle(document.body).backgroundColor); floorColor.lerp(pageColor, Math.min(1, dt * 10)); }
    floor.material.uniforms.uAlpha.value = MathUtils.lerp(0.74, 0.88, smooth(0.6, 0.75, p));

    // Camera: the dealt path, framed taller on phones, with a light lean toward the pointer.
    pose(p, view);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    const portrait = camera.aspect < 1, far = portrait ? MathUtils.clamp(Math.pow(1.3 / camera.aspect, 0.95), 1, 3) : 1;
    camera.position.set(view.pos[0] * far, view.pos[1] * far + (portrait ? 0.6 : 0), view.pos[2] * far);
    camTarget.set(view.target[0], view.target[1] - (portrait ? 1.25 : 0), view.target[2]);
    dirV.subVectors(camTarget, camera.position);
    rightV.crossVectors(dirV, UP).normalize();
    const dist = dirV.length();
    camTarget.addScaledVector(rightV, -(portrait ? 0 : view.side) * dist * 0.26);
    camera.position.addScaledVector(rightV, pointer.x * 0.28).addScaledVector(UP, pointer.y * 0.16);
    camera.lookAt(camTarget);

    // Foam flies off the wash line while it moves; a little dust hangs in the air after.
    const rate = wipe > 0.001 && wipe < 0.999 ? 38 * (1 + 3 * burst) : 0;
    const n = Math.floor(rate * dt + Math.random());
    const lineX = HALF - wipe * LENGTH;
    for (let i = 0; i < n; i++) {
      const sideZ = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.2), top = Math.random() < 0.3;
      fog.emit(lineX + (Math.random() - 0.5) * 0.3, top ? 1.45 : 0.4 + Math.random() * 0.9, top ? (Math.random() - 0.5) * 1.4 : sideZ, 0.5 + 1.4 * burst, 0.25 + 0.6 * burst);
    }
    fog.step(dt);
    renderer.render(scene, camera);
    if (!warm) { warm = true; say(100); stage.classList.add("wash-on"); if (opts.onFrame) opts.onFrame(); }
  }

  const run = () => { if (visible && !document.hidden && !running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); } };
  const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; visible ? run() : halt(); }, { rootMargin: "20% 0px" });
  io.observe(wrap);
  const onHide = () => (document.hidden ? halt() : run());
  document.addEventListener("visibilitychange", onHide);
  const onMove = (e) => { pointer.tx = (e.clientX / innerWidth - 0.5) * 2; pointer.ty = (e.clientY / innerHeight - 0.5) * -2; };
  const onTilt = (e) => { if (e.gamma == null) return; pointer.tx = MathUtils.clamp(e.gamma / 25, -1, 1); pointer.ty = MathUtils.clamp((e.beta - 45) / -30, -1, 1); };
  if (matchMedia("(hover: hover)").matches) addEventListener("pointermove", onMove, { passive: true });
  else if ("DeviceOrientationEvent" in window && typeof DeviceOrientationEvent.requestPermission !== "function") addEventListener("deviceorientation", onTilt, { passive: true });
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  renderer.compile(scene, camera);
  if (still) still.setAttribute("data-behind", "");
  run();

  return () => {
    stopped = true; halt(); io.disconnect(); ro.disconnect();
    document.removeEventListener("visibilitychange", onHide);
    removeEventListener("pointermove", onMove); removeEventListener("deviceorientation", onTilt);
    stage.classList.remove("wash-on");
    renderer.dispose(); canvas.remove();
  };
}
