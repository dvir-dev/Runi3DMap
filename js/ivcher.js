// The Ivcher-Tiomkin building (Psychology and Economics, entry 36), modelled from photos: a long four-storey glass box. A recessed glazed ground floor
// under a white slab edge, three floors of floor-to-ceiling glass with thin dark mullions, a slim white roof fascia that overhangs, blank white end walls
// (the south one carries the two schools' names), glass entrance doors at the middle flanked by white planters, and a brick-paved walk along the front.
// Layout (ivcherParts) is pure metres in a local frame: x along the front (to the viewer's right), y up, z towards the front.
import { K } from "./geo.js";

export const IVCHER = { length: 150, depth: 30, groundH: 5, floorH: 4, floors: 3, slabH: 1.4, groundZ: 11, glassZ: 14.4, edgeZ: 15, roofOver: 1.2, doorW: 7 };

/** @returns {{boxes, sign, doors, planters, walk, roofY, height}} boxes: {x0,x1,y0,y1,z0,z1,kind:"cream"|"dark"|"glass"} (glass = one front quad at z1) */
export function ivcherParts(o = IVCHER) {
  const hx = o.length / 2, hz = o.depth / 2, slabTop = o.groundH + o.slabH, roofY = slabTop + o.floors * o.floorH, boxes = [];
  boxes.push({ x0: -hx, x1: hx, y0: 0, y1: o.groundH, z0: -hz, z1: o.groundZ, kind: "cream" });                                  // ground-floor volume, set back
  boxes.push({ x0: -hx, x1: hx, y0: o.groundH, y1: roofY, z0: -hz, z1: o.glassZ, kind: "cream" });                                // the three glazed floors
  boxes.push({ x0: -hx, x1: hx, y0: o.groundH, y1: slabTop, z0: o.glassZ - 2, z1: o.edgeZ, kind: "cream" });                      // the white slab edge between ground floor and the glass above
  boxes.push({ x0: -hx - 0.3, x1: hx + 0.3, y0: roofY, y1: roofY + 1.3, z0: -hz - 0.3, z1: o.edgeZ + o.roofOver, kind: "cream" });  // roof fascia, overhanging
  boxes.push({ x0: -hx + 0.4, x1: hx - 0.4, y0: 0.2, y1: o.groundH - 0.15, z0: o.groundZ, z1: o.groundZ + 0.05, kind: "dark" });       // ground-floor glazing
  boxes.push({ x0: -hx + 0.2, x1: hx - 0.2, y0: slabTop, y1: roofY - 0.1, z0: o.glassZ, z1: o.glassZ + 0.05, kind: "glass" });        // the glass skin
  boxes.push({ kind: "glass", face: "back", x0: -hx + 0.4, x1: hx - 0.4, y0: 1.2, y1: roofY - 0.4, z0: -hz - 0.05, z1: -hz - 0.05 });          // the back is glazed as well
  const doors = { x0: -o.doorW / 2, x1: o.doorW / 2, y0: 0.2, y1: o.groundH - 0.4, z: o.groundZ + 0.1 };                                // the entrance
  const planters = [-1, 1].map(s => ({ x0: s > 0 ? o.doorW / 2 + 1.5 : -o.doorW / 2 - 13.5, x1: s > 0 ? o.doorW / 2 + 13.5 : -o.doorW / 2 - 1.5, z0: o.groundZ + 1, z1: o.groundZ + 3.2, h: 1.2 }));   // white planters / benches either side
  const sign = { z0: -hz, z1: hz, y0: 7, y1: 15, x: -hx - 0.06 };                                                              // the south end wall (local -x), with the two schools' names
  const walk = { x0: -hx, x1: hx, z0: o.edgeZ + 0.8, z1: o.edgeZ + 6.5 };                                                      // brick paving along the front
  return { boxes, sign, doors, planters, walk, roofY, height: roofY + 1.3 };
}

/** Footprint corners in image px; the front plane (edgeZ) is the building's front edge. */
export function ivcherFootprint(center, dir, front, o = IVCHER) {
  const pxm = 1 / K, hx = o.length / 2;
  return [[-hx, -o.depth / 2], [hx, -o.depth / 2], [hx, o.edgeZ], [-hx, o.edgeZ]].map(([x, z]) => [center[0] + (x * dir[0] + z * front[0]) * pxm, center[1] + (x * dir[1] + z * front[1]) * pxm]);
}

export function createIvcher(THREE, place, materials) {
  const o = IVCHER, P = ivcherParts(o), g = new THREE.Group();
  const cream = { p: [], c: [] }, dark = { p: [] }, glass = { p: [], uv: [] }, brick = { p: [] }, white = new THREE.Color("#DCD8CE"), shade = [1, 0.88, 0.92, 0.8, 1.04];
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const boxOut = (acc, b, col) => {
    const { x0, x1, y0, y1, z0, z1 } = b, f = s => col.clone().multiplyScalar(s);
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], f(shade[0]));
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f(shade[1]));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f(shade[2]));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f(shade[3]));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f(shade[4]));
  };
  for (const b of P.boxes) {
    if (b.kind === "cream") boxOut(cream, b, white);
    else if (b.kind === "dark") boxOut(dark, b, white);
    else { const bay = 1.8, v1 = (b.y1 - b.y0) / o.floorH, z = b.face === "back" ? b.z0 : b.z1; quad(glass, [b.x0, b.y0, z], [b.x1, b.y0, z], [b.x1, b.y1, z], [b.x0, b.y1, z], white, [[b.x0 / bay, 0], [b.x1 / bay, 0], [b.x1 / bay, v1], [b.x0 / bay, v1]]); }
  }
  const d = P.doors;
  for (const pl of P.planters) boxOut(cream, { x0: pl.x0, x1: pl.x1, y0: 0, y1: pl.h, z0: pl.z0, z1: pl.z1 }, new THREE.Color("#E6E2D8"));
  const w = P.walk; quad(brick, [w.x0, 0.05, w.z1], [w.x1, 0.05, w.z1], [w.x1, 0.05, w.z0], [w.x0, 0.05, w.z0], white);
  const mk = (acc, material, withColor, withUv, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const creamMesh = mk(cream, materials.cream, true), glassMesh = mk(glass, materials.glass, false, true), darkMesh = mk(dark, materials.dark);
  g.add(creamMesh, glassMesh, darkMesh, mk(brick, materials.brick, false, false, false));
  if (materials.sign) { const s = P.sign, m = new THREE.Mesh(new THREE.PlaneGeometry(s.z1 - s.z0, s.y1 - s.y0), materials.sign); m.position.set(s.x, (s.y0 + s.y1) / 2, 0); m.rotation.y = -Math.PI / 2; g.add(m); }
  if (materials.doors) { const m = new THREE.Mesh(new THREE.PlaneGeometry(d.x1 - d.x0, d.y1 - d.y0), materials.doors); m.position.set(0, (d.y0 + d.y1) / 2, d.z + 0.02); g.add(m); }
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, glass: glassMesh, cream: creamMesh, height: P.height };
}
