// The student dormitory towers (entry 39), modelled from photos: twelve-floor white towers whose faces are covered by a staggered pattern of dark vertical
// panels and small square windows, with a few wood-lined recesses (balconies cut into the building, each with its floor and railing), a ground floor set back behind columns (an open arcade), and a roof with
// a slim white parapet. Layout (dormParts) is pure metres in a local frame: x, z across the plan, y up. Each tower gets a seed that moves its recesses. The model group is drawn at DORM.scale: the dorms are the tallest buildings on the campus.
import { K } from "./geo.js";

export const DORM = { scale: 1.8, size: 28, floors: 12, floorH: 3.1, groundH: 4.4, inset: 2.6, colW: 0.9, rim: 0.4, rimH: 1.1 };
const hash = i => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

/** @returns {{top:number, height:number, notches:{face:number, c:number, y0:number, w:number, h:number}[], columns:{x:number,z:number}[]}} face 0..3 = +z, +x, -z, -x; c = centre along the face (m) */
export function dormParts(seed = 0, o = DORM) {
  const top = o.groundH + o.floors * o.floorH, half = o.size / 2, notches = [];
  const faces = [0, 1, 2, 3].sort((a, b) => hash(seed * 11 + a) - hash(seed * 11 + b));
  [[faces[0], 0.74, -6], [faces[1], 0.34, 5], [faces[2], 0.52, -4]].forEach(([face, level, c], i) => notches.push({ face, c: c + (hash(seed * 7 + i) - 0.5) * 6, y0: o.groundH + Math.round(level * o.floors) * o.floorH, w: 6.4, h: 2 * o.floorH }));
  const columns = [];
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) if (sx || sz) columns.push({ x: sx * (half - o.colW / 2), z: sz * (half - o.colW / 2) });
  return { top, height: top + o.rimH, notches, columns };
}

/** Footprint corners in image px: centre (px), unit px direction of local +x, size in metres. */
export function dormFootprint(center, dir, size = DORM.size) {
  const pxm = DORM.scale / K, f = [-dir[1], dir[0]], h = size / 2;
  return [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, z]) => [center[0] + (x * dir[0] + z * f[0]) * pxm, center[1] + (x * dir[1] + z * f[1]) * pxm]);
}

export function createDorm(THREE, place, materials, seed) {
  const o = DORM, P = dormParts(seed, o), g = new THREE.Group(), half = o.size / 2;
  const walls = { p: [], uv: [] }, cream = { p: [], c: [] }, dark = { p: [] }, wood = { p: [], c: [] }, grey = { p: [] }, white = new THREE.Color("#DAD7CE");
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c && col) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const boxOut = (acc, b, col) => {
    const { x0, x1, y0, y1, z0, z1 } = b, f = s => col && col.clone().multiplyScalar(s);
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], f(1));
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f(0.88));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f(0.92));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f(0.8));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f(1.04));
  };
  const yb = o.groundH, yt = P.top, tx = 9.6, ty = 12.4, uv = (a, b) => [[a / tx, yb / ty], [b / tx, yb / ty], [b / tx, yt / ty], [a / tx, yt / ty]];   // facade texture: 3 bays x 4 floors per tile
  // the four faces; a face with a recess is built from the wall pieces around the opening, plus the recess itself: back wall, side walls, ceiling and balcony floor
  const at = (face, s, y, d) => [face === 0 ? s : face === 1 ? half - d : face === 2 ? -s : -half + d, y, face === 0 ? half - d : face === 1 ? -s : face === 2 ? -half + d : s];   // s runs along the face, d = depth into the building
  const piece = (face, s0, s1, y0, y1) => quad(walls, at(face, s0, y0, 0), at(face, s1, y0, 0), at(face, s1, y1, 0), at(face, s0, y1, 0), null, [[(s0 + half) / tx, y0 / ty], [(s1 + half) / tx, y0 / ty], [(s1 + half) / tx, y1 / ty], [(s0 + half) / tx, y1 / ty]]);
  const lit = (hex, s) => new THREE.Color(hex).multiplyScalar(s), depth = 3.2;
  for (let face = 0; face < 4; face++) {
    const n = P.notches.find(q => q.face === face);
    if (!n) { piece(face, -half, half, yb, yt); continue; }
    const a = n.c - n.w / 2, b = n.c + n.w / 2, y0 = n.y0, y1 = n.y0 + n.h;
    piece(face, -half, a, yb, yt); piece(face, b, half, yb, yt); piece(face, a, b, yb, y0); piece(face, a, b, y1, yt);
    quad(wood, at(face, a, y0, depth), at(face, b, y0, depth), at(face, b, y1, depth), at(face, a, y1, depth), lit("#CF9F63", 1));             // back wall, lined with wood
    quad(wood, at(face, a, y0, 0), at(face, a, y0, depth), at(face, a, y1, depth), at(face, a, y1, 0), lit("#B98A52", 1));                          // side walls
    quad(wood, at(face, b, y0, depth), at(face, b, y0, 0), at(face, b, y1, 0), at(face, b, y1, depth), lit("#B98A52", 1));
    quad(wood, at(face, a, y1, 0), at(face, b, y1, 0), at(face, b, y1, depth), at(face, a, y1, depth), lit("#9C7343", 1));                          // ceiling
    quad(wood, at(face, a, y0, 0), at(face, a, y0, depth), at(face, b, y0, depth), at(face, b, y0, 0), lit("#8E9096", 1));                          // the balcony floor
    quad(dark, at(face, a, y0, 0.15), at(face, b, y0, 0.15), at(face, b, y0 + 1.1, 0.15), at(face, a, y0 + 1.1, 0.15));                             // the railing along its edge
  }
  boxOut(dark, { x0: -half + o.inset, x1: half - o.inset, y0: 0.1, y1: yb + 0.05, z0: -half + o.inset, z1: half - o.inset });   // the set-back ground floor
  for (const c of P.columns) boxOut(cream, { x0: c.x - o.colW / 2, x1: c.x + o.colW / 2, y0: 0, y1: yb, z0: c.z - o.colW / 2, z1: c.z + o.colW / 2 }, white);
  boxOut(cream, { x0: -half - o.rim, x1: half + o.rim, y0: yt, y1: yt + o.rimH, z0: -half - o.rim, z1: half + o.rim }, white);   // the parapet band
  for (const [x, z, w, d, h] of [[-6, 4, 6, 4, 2], [7, -5, 4, 4, 1.4], [3, 8, 5, 3, 1]]) boxOut(grey, { x0: x - w / 2, x1: x + w / 2, y0: yt + o.rimH, y1: yt + o.rimH + h, z0: z - d / 2, z1: z + d / 2 });
  const mk = (acc, material, withColor, withUv, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const wallMesh = mk(walls, materials.facade, false, true), creamMesh = mk(cream, materials.cream, true);
  g.add(wallMesh, creamMesh, mk(dark, materials.dark), mk(wood, materials.wood, true, false, false), mk(grey, materials.grey));
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot; g.scale.setScalar(o.scale);
  return { group: g, wall: wallMesh, cream: creamMesh, height: P.height * o.scale };
}
