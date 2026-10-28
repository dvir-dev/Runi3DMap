// The Hangar classrooms (Carol and Joey Low Lecture Halls, entry 41), modelled from photos: a big white box with a low gable roof. The long walls are white
// up to a dark band of horizontal louvers under the eaves; the two end walls are tall white pentagons (the south one carries the name, with a grey pilaster at
// its corner and a small glass-canopied side door); the entrance is a glass storefront with doors in the middle of the east long wall, under a glass canopy.
// Layout (hangarParts) is pure metres in a local frame: x along the building (south), y up, z across (+z = the west long side, the entrance is on the -z (east) side).
import { K } from "./geo.js";

export const HANGAR = { length: 80, width: 38, wallH: 6.2, bandH: 3, ridge: 2.4, glazeLen: 13, pilaster: 1.3 };

/** @returns {{walls, band, roof, ends, pilaster, sign, glazing, canopy, sideDoor, height}} */
export function hangarParts(o = HANGAR) {
  const hx = o.length / 2, hz = o.width / 2, eave = o.wallH + o.bandH, ridge = eave + o.ridge;
  return {
    walls: { x0: -hx, x1: hx, z0: -hz, z1: hz, y1: o.wallH },
    band: { x0: -hx, x1: hx, y0: o.wallH, y1: eave, zs: [-hz - 0.06, hz + 0.06] },                      // the dark louver band, both long sides
    roof: { x0: -hx - 0.4, x1: hx + 0.4, eave, ridge, z: hz + 0.5 },                                     // two sloping dark panels meeting at the ridge
    ends: { eave, ridge, hz, xs: [-hx, hx] },                                                             // white pentagon end walls
    pilaster: { x: hx + 0.2, z0: -hz + 8, z1: -hz + 8 + o.pilaster, y1: ridge - 0.6 },                   // the grey vertical strip near the south corner
    sign: { x: hx + 0.08, z: 0, y: eave - 1.6, w: 15, h: 3.2 },                                           // the name on the south end wall
    glazing: { x0: -o.glazeLen / 2, x1: o.glazeLen / 2, y0: 0.3, y1: 5.8, z: -hz - 0.07 },                   // the glass storefront and doors, in the middle of the EAST wall
    canopy: { x0: -o.glazeLen / 2 - 0.5, x1: o.glazeLen / 2 + 0.5, y: 5.9, z0: -hz - 3.4, z1: -hz },                  // glass canopy over them
    sideDoor: { z0: -hz + 11.5, z1: -hz + 15.5, y1: 4.5, x: hx + 0.08 },                                  // the small door with its glass canopy, south end wall
    height: ridge,
  };
}

/** Footprint corners in image px: dir = unit px vector of local +x, front = unit px vector of local +z. */
export function hangarFootprint(center, dir, front, o = HANGAR) {
  const pxm = 1 / K, hx = o.length / 2, hz = o.width / 2;
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([x, z]) => [center[0] + (x * dir[0] + z * front[0]) * pxm, center[1] + (x * dir[1] + z * front[1]) * pxm]);
}

export function createHangar(THREE, place, materials) {
  const o = HANGAR, P = hangarParts(o), g = new THREE.Group();
  const cream = { p: [], c: [] }, louver = { p: [], uv: [] }, roof = { p: [] }, glass = { p: [] }, grey = { p: [] }, white = new THREE.Color("#DCD9D0"), shade = [1, 0.88, 0.92, 0.8, 1.04];
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const boxOut = (acc, b, col) => {
    const { x0, x1, y0, y1, z0, z1 } = b, f = s => col && col.clone().multiplyScalar(s);
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], f(shade[0]));
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f(shade[1]));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f(shade[2]));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f(shade[3]));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f(shade[4]));
  };
  const w = P.walls, b = P.band, r = P.roof, e = P.ends;
  boxOut(cream, { x0: w.x0, x1: w.x1, y0: 0, y1: w.y1, z0: w.z0, z1: w.z1 }, white);                    // the white lower walls
  boxOut(roof, { x0: b.x0 + 0.2, x1: b.x1 - 0.2, y0: b.y0, y1: b.y1, z0: w.z0 + 0.5, z1: w.z1 - 0.5 });  // the dark core of the louver band
  for (const z of b.zs) { const u1 = (b.x1 - b.x0) / 3; quad(louver, [b.x0, b.y0, z], [b.x1, b.y0, z], [b.x1, b.y1, z], [b.x0, b.y1, z], null, [[0, 0], [u1, 0], [u1, (b.y1 - b.y0) / 0.4], [0, (b.y1 - b.y0) / 0.4]]); }
  // gable roof: two sloping panels, and a ridge cap
  const zz = r.z;
  quad(roof, [r.x0, r.eave, zz], [r.x1, r.eave, zz], [r.x1, r.ridge, 0], [r.x0, r.ridge, 0]); quad(roof, [r.x1, r.eave, -zz], [r.x0, r.eave, -zz], [r.x0, r.ridge, 0], [r.x1, r.ridge, 0]);
  for (const x of e.xs) {                                                                                  // pentagon end walls: wall to the eave, then the gable triangle
    const s = x > 0 ? 1 : -1, col = white.clone().multiplyScalar(shade[x > 0 ? 2 : 4]);
    const A = [x, w.y1, -e.hz], B = [x, w.y1, e.hz], C = [x, e.eave, e.hz], D = [x, e.eave, -e.hz], T = [x, e.ridge, 0];
    if (s > 0) { quad(cream, A, B, C, D, col); tri(cream, D, C, T, col); } else { quad(cream, B, A, D, C, col); tri(cream, C, D, T, col); }
  }
  boxOut(grey, { x0: P.pilaster.x - 0.2, x1: P.pilaster.x + 0.5, y0: 0, y1: P.pilaster.y1, z0: P.pilaster.z0, z1: P.pilaster.z1 }, new THREE.Color("#9A968C"));
  const gl = P.glazing; quad(glass, [gl.x0, gl.y0, gl.z], [gl.x1, gl.y0, gl.z], [gl.x1, gl.y1, gl.z], [gl.x0, gl.y1, gl.z]);
  const cn = P.canopy; boxOut(glass, { x0: cn.x0, x1: cn.x1, y0: cn.y, y1: cn.y + 0.12, z0: cn.z0, z1: cn.z1 });
  const sd = P.sideDoor; quad(glass, [sd.x, 0.1, sd.z0], [sd.x, 0.1, sd.z1], [sd.x, sd.y1, sd.z1], [sd.x, sd.y1, sd.z0]); boxOut(glass, { x0: sd.x, x1: sd.x + 2, y0: sd.y1 + 0.3, y1: sd.y1 + 0.4, z0: sd.z0 - 0.3, z1: sd.z1 + 0.3 });
  const mk = (acc, material, withColor, withUv, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const creamMesh = mk(cream, materials.cream, true), louverMesh = mk(louver, materials.louver, false, true);
  g.add(creamMesh, louverMesh, mk(roof, materials.roof), mk(glass, materials.glass), mk(grey, materials.grey, false));
  if (materials.sign) { const s = P.sign, m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), materials.sign); m.position.set(s.x, s.y, s.z); m.rotation.y = Math.PI / 2; g.add(m); }
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, wall: louverMesh, cream: creamMesh, height: P.height };
}
