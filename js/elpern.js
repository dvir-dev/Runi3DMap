// The Elpern Auditorium (entry 13), modelled from photos on the poster's own outline: a white auditorium body (the pentagon with its cut south-west corner)
// with a two-level entrance lobby in the pointed notch on its north-east side: rough beige concrete walls, a glazed ground floor under a dark-grey slab, an upper
// window block, and a thin roof slab overhanging all round (cream underside, dark edge). The body has a plain flat roof with a low parapet and narrow tall windows.
// Everything is built from polygons in world metres: createElpern(THREE, {body, lobby}, materials).
import { offsetPolygon } from "./jusidman.js";

export const ELPERN = { bodyH: 8.2, parapet: 0.5, lobbyH: 7.2, floor: 3.6, slab: 0.5, roofOver: 1.6, roofT: 0.5 };
export const ELPERN_HEIGHT = ELPERN.bodyH + ELPERN.parapet;

export const STEPS = { n: 3, run: 0.55, rise: 0.2, d0: 0.1, hw: 1.6, grow: 0.15, rail: 0.95, railS: 1.5, bar: 0.04 };   // the door's three steps, and the handrail either side of them (all local metres)

/** Handrails of the door steps, in door-local (s along the wall, d out from it, y up) metres: a sloped bar either side plus a post at each end and one between. */
export function doorRails() {
  const t = STEPS, dTop = t.d0 + 0.1, dEnd = t.d0 + t.n * t.run - 0.1, yTop = t.rise * t.n, yEnd = t.rise, rails = [], posts = [];
  for (const side of [-1, 1]) {
    const s = side * t.railS;
    rails.push([[s, dTop, yTop + t.rail], [s, dEnd, yEnd + t.rail]]);
    for (const f of [0, 0.5, 1]) { const d = dTop + (dEnd - dTop) * f, tread = yTop + (yEnd - yTop) * f; posts.push([[s, d, tread], [s, d, tread + t.rail]]); }
  }
  return { rails, posts };
}

const centroid = pts => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);

export function createElpern(THREE, { body, lobby, shared, door }, materials) {
  const o = ELPERN, g = new THREE.Group(), cream = { p: [], c: [] }, glass = { p: [] }, dark = { p: [], c: [] }, W = new THREE.Color("#E8E4D8"), R = new THREE.Color("#BDB19D");
  const tri = (acc, a, c1, c2, col) => { acc.p.push(...a, ...c1, ...c2); if (acc.c && col) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, c1, c2, d, col) => { tri(acc, a, c1, c2, col); tri(acc, a, c2, d, col); };
  const bc = centroid(body), lc = centroid(lobby);
  const wall = (acc, poly, c, y0, y1, col, skip) => {                                                        // outward-facing vertical faces; skip(i) leaves an edge out
    poly.forEach((p, i) => {
      if (skip && skip(i)) return;
      const q = poly[(i + 1) % poly.length], outward = (-(q[1] - p[1])) * ((p[0] + q[0]) / 2 - c[0]) + (q[0] - p[0]) * ((p[1] + q[1]) / 2 - c[1]) > 0;
      const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]], C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
      if (outward) quad(acc, A, B, C, D, col); else quad(acc, B, A, D, C, col);
    });
  };
  const plate = (acc, poly, y0, y1, col, under) => {                                                          // a thin slab: top, underside and edge
    const idx = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const [a, b, c] of idx) {
      for (const [y, up, k] of [[y1, true, 1], [y0, false, 0.8]]) {
        const A = [poly[a][0], y, poly[a][1]], B = [poly[b][0], y, poly[b][1]], C = [poly[c][0], y, poly[c][1]], ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
        tri(acc, A, ...((ny > 0) === up ? [B, C] : [C, B]), (y === y0 && under ? under : col).clone().multiplyScalar(k));
      }
    }
    wall(acc, poly, centroid(poly), y0, y1, col.clone().multiplyScalar(0.9));
  };
  wall(cream, body, bc, 0, o.bodyH, W);                                                                       // the white auditorium body
  plate(cream, body, o.bodyH, o.bodyH + o.parapet, new THREE.Color("#D9D4C4"));                               // flat roof with a low parapet band
  wall(cream, lobby, lc, 0, o.lobbyH, R, i => shared(i));                                                     // the rough concrete lobby (not where it joins the body)
  wall(glass, offsetPolygon(lobby, 0.05), lc, 0.3, o.floor - 0.1, null, i => shared(i));                      // ground-floor glazing: a hair proud of the concrete
  wall(glass, offsetPolygon(lobby, 0.06), lc, o.floor + 1.2, o.lobbyH - 0.9, null, i => shared(i));          // the upper window block
  plate(dark, offsetPolygon(lobby, 0.5), o.floor, o.floor + o.slab, new THREE.Color("#6D7076"));              // the dark-grey slab between the two levels
  plate(dark, offsetPolygon(lobby, o.roofOver), o.lobbyH, o.lobbyH + o.roofT, new THREE.Color("#5B5F66"), new THREE.Color("#D9D3C2"));   // roof slab: dark edge, pale underside
  if (door) {                                                                                                  // the little north-east block: one plain door with three steps up to it
    const [p, q] = door, len = Math.hypot(q[0] - p[0], q[1] - p[1]), tx = (q[0] - p[0]) / len, tz = (q[1] - p[1]) / len;
    let nx = tz, nz = -tx; if (nx * ((p[0] + q[0]) / 2 - bc[0]) + nz * ((p[1] + q[1]) / 2 - bc[1]) < 0) { nx = -nx; nz = -nz; }
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, at = (s, d, y) => [mx + tx * s + nx * d, y, mz + tz * s + nz * d];
    const pane = (s0, s1, y0, y1, d) => quad(glass, at(s0, d, y0), at(s1, d, y0), at(s1, d, y1), at(s0, d, y1));
    for (const [s0, s1, y0, y1, d] of [[-1, 1, 0.6, 3.5, 0.08], [-1.15, -1, 0.6, 3.6, 0.1], [1, 1.15, 0.6, 3.6, 0.1]]) pane(s0, s1, y0, y1, d);
    quad(dark, at(-1.15, 0.12, 3.5), at(1.15, 0.12, 3.5), at(1.15, 0.12, 3.62), at(-1.15, 0.12, 3.62), new THREE.Color("#5B5F66"));
    for (let k = 0; k < 3; k++) {                                                                               // steps: the top one against the wall, each next one lower and further out
      const d0 = STEPS.d0 + k * STEPS.run, d1 = d0 + STEPS.run, y = STEPS.rise * (STEPS.n - k), hw = STEPS.hw + k * STEPS.grow, col = new THREE.Color("#D2CDBE").multiplyScalar(1 - k * 0.04);
      quad(cream, at(-hw, d0, y), at(hw, d0, y), at(hw, d1, y), at(-hw, d1, y), col);                       // tread
      quad(cream, at(-hw, d1, 0), at(hw, d1, 0), at(hw, d1, y), at(-hw, d1, y), col.clone().multiplyScalar(0.85));  // riser
    }
  }
  if (door) {                                                                                                  // handrails either side of the steps: thin dark bars on posts
    const [p, q] = door, len = Math.hypot(q[0] - p[0], q[1] - p[1]), tx = (q[0] - p[0]) / len, tz = (q[1] - p[1]) / len;
    let nx = tz, nz = -tx; if (nx * ((p[0] + q[0]) / 2 - bc[0]) + nz * ((p[1] + q[1]) / 2 - bc[1]) < 0) { nx = -nx; nz = -nz; }
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, at = ([s, d, y]) => [mx + tx * s + nx * d, y, mz + tz * s + nz * d], metal = new THREE.Color("#454A52");
    const bar = (a, b) => {                                                                                    // a square-section bar from a to b
      const dv = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...dv), ref = Math.abs(dv[1]) / L > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], nrm = (v, k) => { const l = Math.hypot(...v); return v.map(c => c / l * k); };
      const u = nrm(cr(dv, ref), STEPS.bar), v = nrm(cr(dv, u), STEPS.bar), c = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => [u[0] * i + v[0] * j, u[1] * i + v[1] * j, u[2] * i + v[2] * j]);
      for (let k = 0; k < 4; k++) { const e = c[k], f = c[(k + 1) % 4]; quad(dark, [a[0] + e[0], a[1] + e[1], a[2] + e[2]], [b[0] + e[0], b[1] + e[1], b[2] + e[2]], [b[0] + f[0], b[1] + f[1], b[2] + f[2]], [a[0] + f[0], a[1] + f[1], a[2] + f[2]], metal); }
    };
    const { rails, posts } = doorRails(); for (const [a, b] of [...rails, ...posts]) bar(at(a), at(b));
  }
  const mk = (acc, material, withColor, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const creamMesh = mk(cream, materials.cream, true), glassMesh = mk(glass, materials.glass);
  g.add(creamMesh, glassMesh, mk(dark, materials.dark, true));
  return { group: g, wall: glassMesh, cream: creamMesh, height: ELPERN_HEIGHT };
}
