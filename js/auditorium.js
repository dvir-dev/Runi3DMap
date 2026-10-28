// The Ivcher Auditorium (entry 8), modelled from photos: a big cream dome (a flattened hemisphere with fine vertical ribs and a small cap on top) with a low
// curved entrance block on one side: a gently curved cream front wall carrying the name, a glazed ground floor with glass doors, a flat grey roof with a small overhang.
// Layout (auditoriumParts) is pure metres in a local frame centred on the dome: +z is the entrance side, y up.
import { K } from "./geo.js";

export const AUDITORIUM = { radius: 19, domeH: 15, capR: 1.6, capH: 1.4, block: { w: 15, d: 9, h: 6.2, z0: 14, bow: 2.2, glassH: 3.8, over: 0.9 } };

/** @returns {{front: number[][], back: number[][], sign, height}} front = the curved front wall as [x, z] points (left to right); back = the straight back edge where the block meets the dome. */
export function auditoriumParts(o = AUDITORIUM) {
  const b = o.block, n = 8, front = [];
  for (let i = 0; i <= n; i++) { const t = i / n * 2 - 1; front.push([t * b.w / 2, b.z0 + b.d + b.bow * (1 - t * t)]); }       // bulges forwards in the middle
  const back = [[-b.w / 2, b.z0], [b.w / 2, b.z0]];
  return { front, back, sign: { y: b.glassH + (b.h - b.glassH) / 2, h: 1.5 }, height: o.domeH + o.capH };
}

/** Footprint corners in image px for the dome's circle (the data polygon), as a regular polygon: centre in px. */
export function auditoriumFootprint(center, sides = 28, o = AUDITORIUM) {
  const r = o.radius / K; return Array.from({ length: sides }, (_, i) => { const a = i / sides * 2 * Math.PI; return [center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]; });
}

export function createAuditorium(THREE, place, materials) {
  const o = AUDITORIUM, P = auditoriumParts(o), b = o.block, g = new THREE.Group();
  const cream = { p: [], c: [] }, glass = { p: [] }, roof = { p: [] }, white = new THREE.Color("#E4DFCB");
  const tri = (acc, a, bb, c, col) => { acc.p.push(...a, ...bb, ...c); if (acc.c && col) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, bb, c, d, col) => { tri(acc, a, bb, c, col); tri(acc, a, c, d, col); };
  // dome: a flattened hemisphere with ribs (a texture of vertical stripes around it)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, o.domeH / o.radius, 1), materials.dome); dome.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(o.capR * 0.6, o.capR, o.capH, 8).translate(0, o.domeH + o.capH / 2 - 0.1, 0), materials.cap);
  // entrance block: curved front wall (cream above the glazing, glass below), flat grey roof with an overhang, straight side walls
  const F = P.front, lit = s => white.clone().multiplyScalar(s);
  for (let i = 0; i < F.length - 1; i++) {
    const [x0, z0] = F[i], [x1, z1] = F[i + 1];
    quad(glass, [x0, 0.1, z0], [x1, 0.1, z1], [x1, b.glassH, z1], [x0, b.glassH, z0]);                                        // glazing
    quad(cream, [x0, b.glassH, z0], [x1, b.glassH, z1], [x1, b.h, z1], [x0, b.h, z0], lit(0.95));                               // cream band above (the sign sits here)
  }
  for (const s of [-1, 1]) { const [x, z] = s < 0 ? F[0] : F[F.length - 1]; quad(cream, [x, 0, z], [x, 0, b.z0], [x, b.h, b.z0], [x, b.h, z], lit(0.88)); }   // straight side walls (the material is two-sided)
  const ov = b.over, R = F.map(([x, z]) => [x * (1 + ov / b.w), z + ov]);                              // flat roof over the whole block, overhanging the curved front
  const outline = [[-b.w / 2 - ov, b.z0], ...R, [b.w / 2 + ov, b.z0]], top = b.h + 0.35;
  const idx = THREE.ShapeUtils.triangulateShape(outline.map(([x, z]) => new THREE.Vector2(x, z)), []);
  const up = (A, B, C, y, upward) => { const ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]); tri(roof, [A[0], y, A[1]], ...((ny > 0) === upward ? [[B[0], y, B[1]], [C[0], y, C[1]]] : [[C[0], y, C[1]], [B[0], y, B[1]]])); };
  for (const [a, c1, c2] of idx) { up(outline[a], outline[c1], outline[c2], top, true); up(outline[a], outline[c1], outline[c2], b.h, false); }
  for (let k = 0; k < outline.length; k++) { const A = outline[k], B = outline[(k + 1) % outline.length]; quad(roof, [A[0], b.h, A[1]], [B[0], b.h, B[1]], [B[0], top, B[1]], [A[0], top, A[1]]); }   // the roof's edge (two-sided material)
  const mk = (acc, material, withColor, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const blockMesh = mk(cream, materials.cream, true);
  g.add(dome, cap, blockMesh, mk(glass, materials.glass), mk(roof, materials.roof));
  if (materials.sign) {                                                                                  // the sign follows the curve of the wall, a hair in front of it
    const pos = [], uv = [], a = 1, c = F.length - 2, total = c - a, y0 = P.sign.y - P.sign.h / 2, y1 = P.sign.y + P.sign.h / 2;
    for (let k = a; k < c; k++) { const [x0, z0] = F[k], [x1, z1] = F[k + 1], u0 = (k - a) / total, u1 = (k + 1 - a) / total; pos.push(x0, y0, z0 + 0.05, x1, y0, z1 + 0.05, x1, y1, z1 + 0.05, x0, y0, z0 + 0.05, x1, y1, z1 + 0.05, x0, y1, z0 + 0.05); uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); sg.computeVertexNormals(); g.add(new THREE.Mesh(sg, materials.sign));
  }
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, wall: dome, cream: blockMesh, height: P.height };
}
