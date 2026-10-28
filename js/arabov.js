// The Arabov Gate building (entry 40), modelled from photos: the campus entrance, a long white building made of stone-clad pavilions under one thin, flat,
// cantilevered white roof slab. The road runs through an open passage in the middle; west of it a big blank pavilion, east of it a block with a tall glazed door
// and slits, an open bay, and a last pavilion carrying the name. Layout (arabovParts) is pure metres in a local frame: x along the gate, y up, z towards the campus (north).
import { K } from "./geo.js";

export const ARABOV = { length: 72, depth: 12, blockH: 5.8, slabT: 0.75, over: 1.6, passage: [-11, 11] };

/** @returns {{blocks, slab, doors, slits, signs, height}} blocks: {x0,x1} pavilions (full depth); the roof slab spans everything. */
export function arabovParts(o = ARABOV) {
  const hx = o.length / 2, hz = o.depth / 2;
  const blocks = [{ x0: -hx, x1: o.passage[0], name: "left" }, { x0: o.passage[1], x1: o.passage[1] + 11, name: "doors" }, { x0: o.passage[1] + 16, x1: hx, name: "name" }];
  return {
    blocks, hz,
    slab: { x0: -hx - o.over, x1: hx + o.over, y0: o.blockH, y1: o.blockH + o.slabT, z0: -hz - o.over, z1: hz + o.over },
    faces: [1, -1],                                                                                       // the same design on both long faces: +1 = the campus side, -1 = the street side
    doors: { x0: o.passage[1] + 3.5, x1: o.passage[1] + 7.5, y0: 0.2, y1: 4.7, z: hz + 0.07 },
    slits: [[-17, -16], [-14.6, -13.6], [o.passage[1] + 1.2, o.passage[1] + 2.2], [o.passage[1] + 8.8, o.passage[1] + 9.8]].map(([a, b]) => ({ x0: a, x1: b, y0: 0.6, y1: 5.0, z: hz + 0.07 })),
    signs: [{ x: (o.passage[1] + 16 + hx) / 2, y: 3.4, z: hz + 0.05, w: 6.6, h: 2.8, text: "arabov" }, { x: (-hx + o.passage[0]) / 2, y: 3.7, z: hz + 0.05, w: 9.6, h: 2.6, text: "idc" }],   // each centred on its own pavilion
    height: o.blockH + o.slabT,
  };
}

/** Footprint corners in image px (the roof slab outline): dir = unit px vector of local +x, front = of local +z. */
export function arabovFootprint(center, dir, front, o = ARABOV) {
  const pxm = 1 / K, hx = o.length / 2 + o.over, hz = o.depth / 2 + o.over;
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([x, z]) => [center[0] + (x * dir[0] + z * front[0]) * pxm, center[1] + (x * dir[1] + z * front[1]) * pxm]);
}

export function createArabov(THREE, place, materials) {
  const o = ARABOV, P = arabovParts(o), g = new THREE.Group(), hz = P.hz;
  const stone = { p: [], uv: [] }, cream = { p: [], c: [] }, dark = { p: [] }, white = new THREE.Color("#E3DFD2");
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c && col) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const t = 2.4;                                                                                          // stone panel size (m) for the texture
  for (const b of P.blocks) {                                                                            // each pavilion: four stone-clad walls
    const w = b.x1 - b.x0, y1 = o.blockH, d = 2 * hz;
    quad(stone, [b.x0, 0, hz], [b.x1, 0, hz], [b.x1, y1, hz], [b.x0, y1, hz], null, [[b.x0 / t, 0], [b.x1 / t, 0], [b.x1 / t, y1 / t], [b.x0 / t, y1 / t]]);              // north (front)
    quad(stone, [b.x1, 0, -hz], [b.x0, 0, -hz], [b.x0, y1, -hz], [b.x1, y1, -hz], null, [[b.x1 / t, 0], [b.x0 / t, 0], [b.x0 / t, y1 / t], [b.x1 / t, y1 / t]]);          // south
    quad(stone, [b.x1, 0, hz], [b.x1, 0, -hz], [b.x1, y1, -hz], [b.x1, y1, hz], null, [[0, 0], [d / t, 0], [d / t, y1 / t], [0, y1 / t]]);                                  // west end
    quad(stone, [b.x0, 0, -hz], [b.x0, 0, hz], [b.x0, y1, hz], [b.x0, y1, -hz], null, [[0, 0], [d / t, 0], [d / t, y1 / t], [0, y1 / t]]);                                  // east end
  }
  const s = P.slab, box = (acc, x0, x1, y0, y1, z0, z1, col) => {                                        // the roof slab
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col.clone().multiplyScalar(1));
    quad(acc, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col.clone().multiplyScalar(0.86));                       // underside, seen from below
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col.clone().multiplyScalar(0.9));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col.clone().multiplyScalar(0.78));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col.clone().multiplyScalar(0.92));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col.clone().multiplyScalar(1.03));
  };
  box(cream, s.x0, s.x1, s.y0, s.y1, s.z0, s.z1, white);
  for (const f of P.faces) {                                                                              // doors and slits, on both faces (z mirrored, winding kept facing outwards)
    const gl = P.doors, z = gl.z * f, flip = f < 0, ring = (x0, x1, y0, y1, zz) => (flip ? quad(dark, [x1, y0, zz], [x0, y0, zz], [x0, y1, zz], [x1, y1, zz]) : quad(dark, [x0, y0, zz], [x1, y0, zz], [x1, y1, zz], [x0, y1, zz]));
    ring(gl.x0, gl.x1, gl.y0, gl.y1, z);
    for (const sl of P.slits) ring(sl.x0, sl.x1, sl.y0, sl.y1, sl.z * f);
  }
  const mk = (acc, material, withColor, withUv, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const stoneMesh = mk(stone, materials.stone, false, true), creamMesh = mk(cream, materials.cream, true);
  g.add(stoneMesh, creamMesh, mk(dark, materials.dark));
  for (const f of P.faces) for (const sg of P.signs) { const mat = materials.signs && materials.signs[sg.text]; if (!mat) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(sg.w, sg.h), mat); m.position.set(sg.x, sg.y, sg.z * f); if (f < 0) m.rotation.y = Math.PI; g.add(m); }
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, wall: stoneMesh, cream: creamMesh, height: P.height };
}
