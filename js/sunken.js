// The sunken walkway beside the Lauder wing (31): the paved strip between the lawn and the wing's west wall is dug about 2 m down.
// Along its length, north to south: street level | 10 steps down | floor | 10 steps up | street level. The two long sides are plain retaining walls.
// The ground plane and the slab top get a hole over it; this module builds the floor, the steps and the walls. Layout is pure.
import { K } from "./geo.js";

const WALL = "#CFC5A8", RAIL = "#6B7480";

/** @param cfg {yN,yS, west:{x0,y0,slope}, east:{x0,y0,slope}, width: fraction of the strip that is dug, depth (m), steps, run (m per step)} (image px; edges are lines x = x0 + slope·(y−y0)) */
export function sunkenLayout(cfg, W, H) {
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K;
  const xw = y => cfg.west.x0 + cfg.west.slope * (y - cfg.west.y0), xe = y => cfg.east.x0 + cfg.east.slope * (y - cfg.east.y0);
  const at = (f, y) => [wx(xw(y) + f * (xe(y) - xw(y))), wz(y)];              // world point at cross-strip fraction f (0 = lawn side), image row y
  const n = cfg.steps, rise = cfg.depth / n, runPx = cfg.run / K, top = 0.02, fw = cfg.width;
  const treads = [], risers = [];                                              // treads: {y0, y1 (image rows), h, k: depth fraction, north: bool}; risers: {y, from, to}
  for (let j = 0; j < n; j++) {
    const h = -(j + 1) * rise, k = (j + 1) / n;
    if (j < n - 1) {
      treads.push({ y0: cfg.yN + j * runPx, y1: cfg.yN + (j + 1) * runPx, h, k, north: true });
      treads.push({ y0: cfg.yS - (j + 1) * runPx, y1: cfg.yS - j * runPx, h, k, north: false });
    }
    risers.push({ y: cfg.yN + j * runPx, from: j ? -j * rise : top, to: h });
    risers.push({ y: cfg.yS - j * runPx, from: j ? -j * rise : top, to: h });
  }
  const floor = { y0: cfg.yN + (n - 1) * runPx, y1: cfg.yS - (n - 1) * runPx, h: -cfg.depth };
  const hole = [at(0, cfg.yN), at(fw, cfg.yN), at(fw, cfg.yS), at(0, cfg.yS)];
  const holePx = [[xw(cfg.yN), cfg.yN], [xw(cfg.yN) + fw * (xe(cfg.yN) - xw(cfg.yN)), cfg.yN], [xw(cfg.yS) + fw * (xe(cfg.yS) - xw(cfg.yS)), cfg.yS], [xw(cfg.yS), cfg.yS]];
  return { at, treads, risers, floor, hole, holePx, rise, depth: cfg.depth, width: fw, yN: cfg.yN, yS: cfg.yS, top };
}

/** Even-odd "is this fragment inside the hole" test: the ground plane (and the slab top) discard those fragments. */
export function punchHole(THREE, material, poly) {
  const n = poly.length;
  material.onBeforeCompile = shader => {
    shader.uniforms.uHole = { value: poly.map(p => new THREE.Vector2(p[0], p[1])) };
    shader.vertexShader = shader.vertexShader.replace("void main() {", "varying vec2 vHoleXZ;\nvoid main() {").replace("#include <begin_vertex>", "#include <begin_vertex>\n  vHoleXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", `varying vec2 vHoleXZ;\nuniform vec2 uHole[${n}];\nvoid main() {\n  bool inside = false;\n  for (int i = 0; i < ${n}; i++) { vec2 a = uHole[i], b = uHole[i == ${n - 1} ? 0 : i + 1];\n    if ((a.y > vHoleXZ.y) != (b.y > vHoleXZ.y) && vHoleXZ.x < (b.x - a.x) * (vHoleXZ.y - a.y) / (b.y - a.y) + a.x) inside = !inside; }\n  if (inside) discard;`);
  };
  material.customProgramCacheKey = () => "hole" + n;
}

export function createSunken(THREE, cfg, W, H, rect, groundTexture) {
  const L = sunkenLayout(cfg, W, H), g = new THREE.Group(), w = rect.maxX - rect.minX, d = rect.maxZ - rect.minZ, fw = L.width;
  const quad = (a, b, c, e) => [...a, ...b, ...c, ...a, ...c, ...e];
  const P = (f, y, h) => { const [x, z] = L.at(f, y); return [x, h, z]; };
  const geo = (pos, col, uv) => { const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); if (col) bg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); if (uv) bg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return bg; };
  // treads: two bands each (a darker one beside the riser above it), darker with depth, so the steps read from straight above
  const tp = [], tc = [], light = new THREE.Color("#F4EFE4"), deep = new THREE.Color("#9C9689"), shade = new THREE.Color();
  for (const t of L.treads) {
    const cut = t.north ? t.y0 + (t.y1 - t.y0) * 0.35 : t.y1 - (t.y1 - t.y0) * 0.35;      // the dark band sits against the riser, on the higher side
    for (const [a, b, dark] of t.north ? [[t.y0, cut, true], [cut, t.y1, false]] : [[t.y0, cut, false], [cut, t.y1, true]]) {
      shade.copy(light).lerp(deep, t.k); if (dark) shade.multiplyScalar(0.72);
      tp.push(...quad(P(0, a, t.h), P(fw, a, t.h), P(fw, b, t.h), P(0, b, t.h)));
      for (let n = 0; n < 6; n++) tc.push(shade.r, shade.g, shade.b);
    }
  }
  const basic = o => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, ...o });
  g.add(new THREE.Mesh(geo(tp, tc), basic({ vertexColors: true })));
  // floor: the ground texture, same colour as the other paths
  const fp = quad(P(0, L.floor.y0, L.floor.h), P(fw, L.floor.y0, L.floor.h), P(fw, L.floor.y1, L.floor.h), P(0, L.floor.y1, L.floor.h)), fuv = [];
  for (let i = 0; i < fp.length; i += 3) fuv.push((fp[i] - rect.minX) / w, 1 - (fp[i + 2] - rect.minZ) / d);   // ground-texture UVs: north = top
  g.add(new THREE.Mesh(geo(fp, null, fuv), basic({ map: groundTexture })));
  // risers across the strip, and the two long retaining walls
  const rp = []; for (const r of L.risers) rp.push(...quad(P(0, r.y, r.from), P(fw, r.y, r.from), P(fw, r.y, r.to), P(0, r.y, r.to)));
  for (const f of [0, fw]) rp.push(...quad(P(f, L.yN, L.top), P(f, L.yS, L.top), P(f, L.yS, -L.depth), P(f, L.yN, -L.depth)));
  g.add(new THREE.Mesh(geo(rp), basic({ color: WALL })));
  // handrails: a thin rail and a few posts along both sides of each flight, as on the real steps
  const rp2 = [], rail = (f, y0, y1) => { const a = P(f, y0, 1.0), b = P(f, y1, 1.0); for (const dy of [0, 0.12]) rp2.push(a[0], a[1] + dy, a[2], b[0], b[1] + dy, b[2], b[0], b[1] + dy + 0.05, b[2], a[0], a[1] + dy, a[2], b[0], b[1] + dy + 0.05, b[2], a[0], a[1] + dy + 0.05, a[2]); };
  const flightPx = (cfg.steps - 1) * cfg.run / K;
  for (const f of [0.04, fw - 0.04]) { rail(f, cfg.yN, cfg.yN + flightPx); rail(f, cfg.yS - flightPx, cfg.yS); }
  g.add(new THREE.Mesh(geo(rp2), basic({ color: RAIL })));
  g.userData.hole = L.hole; g.userData.holePx = L.holePx;
  return g;
}
