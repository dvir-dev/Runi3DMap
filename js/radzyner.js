// The Radzyner Administration Building (entry 12), modelled from photos: a white modernist building whose front is a stack of long white
// fascias stepping back level by level, with dark recessed bands between them; the sign on the lowest fascia; a tall stair tower at one end with the
// blue climbing figures; a white stair with a blue railing at the other end; a recessed ground floor with a low white wall.
// Layout (radzynerParts) is pure metres in a local frame: x along the front, y up, z towards the front.
import { K } from "./geo.js";

export const RADZYNER = { length: 72, depth: 28, tower: 5, towerH: 16.5, coreX0: -31, coreX1: 36, coreZ0: -14, coreZ1: 7, roofY: 14.4,
  levels: [{ y0: 3.6, y1: 5.6, z: 11.5 }, { y0: 7.2, y1: 9.2, z: 10 }, { y0: 10.8, y1: 12.8, z: 8.5 }], darkBands: [[5.6, 7.2], [9.2, 10.8], [12.8, 14.4]] };

/** @returns {{boxes, sign, statues, stair, forecourt, hedge, height}} boxes: {x0,x1,y0,y1,z0,z1,kind:"cream"|"dark"|"blue"} */
export function radzynerParts(o = RADZYNER) {
  const boxes = [];
  boxes.push({ x0: o.coreX0, x1: o.coreX1, y0: 0, y1: o.roofY, z0: o.coreZ0, z1: o.coreZ1, kind: "cream" });                          // the core
  boxes.push({ x0: o.coreX0, x1: o.coreX1 + 0.5, y0: o.roofY, y1: o.roofY + 0.6, z0: o.coreZ0 - 0.5, z1: o.levels[2].z + 1.2, kind: "cream" });   // flat roof with an overhang
  boxes.push({ x0: o.coreX0 + 2, x1: o.coreX1 - 14, y0: 0.3, y1: o.levels[0].y0 - 0.1, z0: o.coreZ1, z1: o.coreZ1 + 0.06, kind: "dark" });     // ground-floor glazing and doors
  boxes.push({ x0: -6, x1: 10, y0: 0, y1: 1.2, z0: o.coreZ1 + 0.5, z1: o.coreZ1 + 2.4, kind: "cream" });                              // the low white wall by the entrance
  for (const l of o.levels) boxes.push({ x0: o.coreX0, x1: o.coreX1, y0: l.y0, y1: l.y1, z0: o.coreZ1, z1: l.z, kind: "cream" });      // the fascias, stepping back
  for (const [a, b] of o.darkBands) boxes.push({ x0: o.coreX0 + 0.5, x1: o.coreX1 - 0.5, y0: a, y1: b, z0: o.coreZ1 + 0.06, z1: o.coreZ1 + 0.1, kind: "dark" });   // recessed window bands
  for (const [a, b] of o.darkBands) boxes.push({ x0: o.coreX0 + 0.5, x1: o.coreX1 - 0.5, y0: a, y1: b, z0: o.coreZ0 - 0.1, z1: o.coreZ0 - 0.06, kind: "dark" });   // and a few on the back
  boxes.push({ x0: o.coreX0 - o.tower, x1: o.coreX0, y0: 0, y1: o.towerH, z0: o.coreZ0, z1: 9.5, kind: "cream" });                      // the stair tower at the left end
  const statues = [[-33.4, 6.2], [-32.6, 9.6], [-33.6, 13.2]].map(([x, y], i) => ({ x, y, z: 9.7, w: 0.8, h: 1.8, d: 0.6, lean: (i - 1) * 0.35 }));   // the blue climbing figures
  const stair = { x0: o.coreX1 - 12, x1: o.coreX1, z0: o.coreZ1, z1: o.levels[0].z + 1.5, yLow: 0.4, yHigh: o.levels[0].y0 };           // white stair wall rising to the first terrace, with a blue railing
  const sign = { x0: -9, x1: 25, y0: o.levels[0].y0 + 0.2, y1: o.levels[0].y1 - 0.2, z: o.levels[0].z + 0.06 };
  const forecourt = { x0: -o.length / 2, x1: o.length / 2, z0: o.levels[0].z + 1, z1: o.levels[0].z + 13 };                           // red brick paving
  const hedge = { x0: -30, x1: -9, z0: o.levels[0].z + 1.6, z1: o.levels[0].z + 3.2, h: 1.3 };
  return { boxes, sign, statues, stair, forecourt, hedge, height: o.towerH };
}

/** Footprint corners in image px (same convention as adelsonFootprint). */
export function radzynerFootprint(center, dir, front, o = RADZYNER) {
  const pxm = 1 / K, a = o.coreX0 - o.tower, b = o.coreX1, z0 = o.coreZ0, z1 = o.levels[0].z;
  return [[a, z0], [b, z0], [b, z1], [a, z1]].map(([x, z]) => [center[0] + (x * dir[0] + z * front[0]) * pxm, center[1] + (x * dir[1] + z * front[1]) * pxm]);
}

export function createRadzyner(THREE, place, materials) {
  const o = RADZYNER, P = radzynerParts(o), g = new THREE.Group();
  const cream = { p: [], c: [] }, dark = { p: [] }, blue = { p: [] }, brick = { p: [] }, hedge = { p: [] }, white = new THREE.Color("#DAD6CB"), shade = [1, 0.86, 0.92, 0.8, 1.04];
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); };
  const boxOut = (acc, b, col) => {
    const { x0, x1, y0, y1, z0, z1 } = b, f = s => col.clone().multiplyScalar(s);
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], f(shade[0]));
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f(shade[1]));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f(shade[2]));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f(shade[3]));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f(shade[4]));
  };
  for (const b of P.boxes) boxOut(b.kind === "cream" ? cream : b.kind === "dark" ? dark : blue, b, white);
  for (const s of P.statues) boxOut(blue, { x0: s.x - s.w / 2 + s.lean, x1: s.x + s.w / 2 + s.lean, y0: s.y, y1: s.y + s.h, z0: s.z, z1: s.z + s.d }, white);
  // the stair: a white wedge rising towards the building, plus a blue railing along its slope
  const st = P.stair, A = [st.x0, st.yLow, st.z1], B = [st.x1, st.yHigh, st.z1], C = [st.x1, st.yHigh, st.z0], D = [st.x0, st.yLow, st.z0], f0 = white.clone();
  quad(cream, D, C, B, A, f0.clone().multiplyScalar(shade[0]));                                                         // sloping top
  quad(cream, [st.x0, 0, st.z1], [st.x1, 0, st.z1], B, A, f0.clone().multiplyScalar(shade[1]));                         // front face
  tri(cream, [st.x0, 0, st.z1], A, [st.x0, 0, st.z0], f0.clone().multiplyScalar(shade[4])); tri(cream, A, D, [st.x0, 0, st.z0], f0.clone().multiplyScalar(shade[4]));
  quad(blue, [st.x0, st.yLow + 0.9, st.z1], [st.x1, st.yHigh + 0.9, st.z1], [st.x1, st.yHigh + 1.0, st.z1], [st.x0, st.yLow + 1.0, st.z1], white);   // railing
  // forecourt and hedge
  const fc = P.forecourt; quad(brick, [fc.x0, 0.05, fc.z1], [fc.x1, 0.05, fc.z1], [fc.x1, 0.05, fc.z0], [fc.x0, 0.05, fc.z0], white);
  boxOut(hedge, { x0: P.hedge.x0, x1: P.hedge.x1, y0: 0, y1: P.hedge.h, z0: P.hedge.z0, z1: P.hedge.z1 }, white);
  const mk = (acc, material, withColor, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const creamMesh = mk(cream, materials.cream, true), darkMesh = mk(dark, materials.dark), blueMesh = mk(blue, materials.blue);
  g.add(creamMesh, darkMesh, blueMesh, mk(brick, materials.brick, false, false), mk(hedge, materials.hedge));
  if (materials.sign) { const s = P.sign, sm = new THREE.Mesh(new THREE.PlaneGeometry(s.x1 - s.x0, s.y1 - s.y0), materials.sign); sm.position.set((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, s.z); g.add(sm); }
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, wall: darkMesh, cream: creamMesh, height: P.height };
}
