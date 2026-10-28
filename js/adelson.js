// The Adelson School of Entrepreneurship, modelled from photos: a four-storey white concrete building (a tall glazed ground floor and three floors above) whose long front is a row of tall
// white fins with slanted tops (rising towards one end) in front of dark glass, a recessed glazed ground floor, and a solid white end block
// with narrow vertical windows. Layout (adelsonParts) is pure metres in a local frame: x along the front, y up, z towards the front.
import { K } from "./geo.js";

export const ADELSON = { scale: 1.8, length: 78, depth: 22, wing: 14, fins: 14, finT: 0.9, finOut: 3.2, glassZ: 8, groundZ: 4.5, floorH: 4, groundH: 6, floors: 3, wingH: 22, finLow: 19, finRise: 2.4, slant: 1.8 };   // metres before `scale`; the model is drawn 1.8x: it is the biggest building of the campus, and the cars and parking bays are drawn about 2.8x, so it has to look big next to them

/** @returns {{boxes: {x0,x1,y0,y1,z0,z1,kind}[], fins: {x:number, top0:number, top1:number}[], canopies, benches, height:number, roofY:number}} kind: "cream" | "glass" | "dark". Fin tops: y at the back (top0) and at the front (top1). */
export function adelsonParts(o = ADELSON) {
  const half = o.length / 2, slabX0 = -half, slabX1 = half - o.wing, roofY = o.groundH + o.floors * o.floorH, boxes = [], fins = [];
  boxes.push({ x0: slabX0, x1: slabX1, y0: 0, y1: o.groundH, z0: -o.depth / 2, z1: o.groundZ, kind: "cream" });                 // ground floor, set back (the fins stand in front of it)
  boxes.push({ x0: slabX0, x1: slabX1, y0: o.groundH, y1: roofY, z0: -o.depth / 2, z1: o.glassZ, kind: "cream" });              // the six-storey body
  boxes.push({ x0: slabX0, x1: slabX1, y0: 0.2, y1: o.groundH - 0.2, z0: o.groundZ, z1: o.groundZ + 0.05, kind: "dark" });      // ground-floor glazing
  boxes.push({ x0: slabX0, x1: slabX1, y0: o.groundH, y1: roofY - 0.3, z0: o.glassZ, z1: o.glassZ + 0.05, kind: "glass" });     // the glass skin between the fins
  boxes.push({ x0: slabX1, x1: half, y0: 0, y1: o.wingH, z0: -o.depth / 2, z1: o.depth / 2, kind: "cream" });                   // the solid end block
  for (const dz of [0, 1]) boxes.push({ x0: slabX1 + 2.2 + dz * 2.4, x1: slabX1 + 3.4 + dz * 2.4, y0: o.groundH + 2, y1: o.wingH - 3, z0: o.depth / 2, z1: o.depth / 2 + 0.06, kind: "dark" });   // narrow windows on the block's front
  const gy0 = 1.2, gTop = roofY - 0.6, d2 = o.depth / 2;                                                                       // glazing on the other sides too: the back, and the two ends
  boxes.push({ kind: "glass", face: "back", x0: slabX0 + 0.4, x1: slabX1 - 0.4, y0: gy0, y1: gTop, z0: -d2 - 0.05, z1: -d2 - 0.05 });
  boxes.push({ kind: "glass", face: "back", x0: slabX1 + 0.4, x1: half - 0.4, y0: gy0, y1: o.wingH - 1, z0: -d2 - 0.05, z1: -d2 - 0.05 });
  boxes.push({ kind: "glass", face: "west", x0: slabX0 - 0.05, x1: slabX0 - 0.05, y0: gy0, y1: gTop, z0: -d2 + 0.6, z1: o.glassZ - 0.4 });
  boxes.push({ kind: "glass", face: "east", x0: half + 0.05, x1: half + 0.05, y0: gy0, y1: o.wingH - 1, z0: -d2 + 0.8, z1: d2 - 0.8 });
  const canopies = [-11, -5.2, 0.6].map(x => ({ x0: x - 2.7, x1: x + 2.7, back: 4.3, front: 3.5, z0: o.groundZ, z1: o.groundZ + 4.6 }));   // three folded white canopies over the entrance
  const span = slabX1 - slabX0;
  for (let i = 0; i < o.fins; i++) {
    const x = slabX0 + (i + 0.5) * span / o.fins, t = i / (o.fins - 1), top0 = o.finLow + o.finRise * t;                         // taller towards the end block
    fins.push({ x, top0, top1: top0 - o.slant });
  }
  const benches = [-26, -9, 9, 24].map(x => ({ x, z: o.glassZ + o.finOut + 6.5, w: 3.2, d: 0.9, h: 0.6 }));                  // sitting areas on the plaza
  return { boxes, fins, canopies, benches, height: o.wingH, roofY };
}

/** Builds the meshes. `place` = {x, z, rot} world position of the model centre and its rotation about y. Returns {group, glass, cream} (glass = walls & windows, cream = concrete). */
export function createAdelson(THREE, place, materials) {
  const o = ADELSON, P = adelsonParts(o), g = new THREE.Group();
  const cream = { p: [], c: [] }, glass = { p: [], uv: [] }, dark = { p: [] }, red = { p: [] }, white = new THREE.Color("#D4D0C4"), shade = [1, 0.86, 0.92, 0.8, 1.04, 0.7];   // top, +z, +x, -z, ... per face
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const boxOut = (acc, b, col) => {                                           // an axis-aligned box: 5 faces (no bottom)
    const { x0, x1, y0, y1, z0, z1 } = b, f = (s) => col.clone().multiplyScalar(s);
    quad(acc, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], f(shade[0]));
    quad(acc, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f(shade[1]));
    quad(acc, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f(shade[2]));
    quad(acc, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f(shade[3]));
    quad(acc, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f(shade[4]));
  };
  for (const b of P.boxes) {
    if (b.kind === "cream") boxOut(cream, b, white);
    else if (b.kind === "dark") boxOut(dark, b, white);
    else {                                                                   // glass: one quad per facade, UV in bays (along) and floors (up)
      const bay = (o.length - o.wing) / o.fins, v0 = (b.y0 - o.groundH) / o.floorH, v1 = (b.y1 - o.groundH) / o.floorH;
      if (b.face === "west" || b.face === "east") { const u0 = b.z0 / bay, u1 = b.z1 / bay, x = b.x0; quad(glass, [x, b.y0, b.z0], [x, b.y0, b.z1], [x, b.y1, b.z1], [x, b.y1, b.z0], white, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]); }
      else { const u0 = b.x0 / bay, u1 = b.x1 / bay, z = b.face === "back" ? b.z0 : b.z1; quad(glass, [b.x0, b.y0, z], [b.x1, b.y0, z], [b.x1, b.y1, z], [b.x0, b.y1, z], white, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]); }
    }
  }
  const t = o.finT / 2;
  for (const f of P.fins) {                                                  // each fin: a blade with a slanted top (lower at the front)
    const x0 = f.x - t, x1 = f.x + t, zb = -2, zf = o.glassZ + o.finOut, yb = 0;
    const A = [x0, yb, zf], B = [x1, yb, zf], C = [x1, f.top1, zf], D = [x0, f.top1, zf], E = [x0, f.top0, zb], F = [x1, f.top0, zb];
    quad(cream, A, B, C, D, white.clone().multiplyScalar(shade[1]));                                       // front edge
    quad(cream, D, C, F, E, white.clone().multiplyScalar(shade[0] * 1.02));                                // slanted top
    quad(cream, B, [x1, yb, zb], F, C, white.clone().multiplyScalar(shade[2]));                            // east side
    quad(cream, [x0, yb, zb], A, D, E, white.clone().multiplyScalar(shade[4]));                            // west side
  }
  const frontW = white.clone().multiplyScalar(shade[1]);
  for (const c of P.canopies) {                                              // canopy: a thin slab sloping down towards the front
    const A = [c.x0, c.front, c.z1], B = [c.x1, c.front, c.z1], C = [c.x1, c.back, c.z0], D = [c.x0, c.back, c.z0], th = 0.3;
    quad(cream, D, C, B, A, white.clone().multiplyScalar(shade[0]));
    quad(cream, [c.x0, c.front - th, c.z1], [c.x1, c.front - th, c.z1], B, A, frontW);
    quad(cream, B, [c.x1, c.front - th, c.z1], [c.x1, c.back - th, c.z0], C, white.clone().multiplyScalar(shade[2]));
    quad(cream, [c.x0, c.front - th, c.z1], A, D, [c.x0, c.back - th, c.z0], white.clone().multiplyScalar(shade[4]));
  }
  for (const b of P.benches) boxOut(dark, { x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: 0, y1: b.h, z0: b.z - b.d / 2, z1: b.z + b.d / 2 }, white);
  // roof parapet and a few rooftop boxes
  const roof = { x0: -o.length / 2, x1: o.length / 2 - o.wing, y0: P.roofY, y1: P.roofY + 0.5, z0: -o.depth / 2, z1: o.glassZ };
  boxOut(cream, { ...roof, x1: roof.x1, z0: roof.z1 - 0.4, z1: roof.z1 }, white); boxOut(cream, { ...roof, z1: roof.z0 + 0.4 }, white);
  for (const [x, z, w, h] of [[-20, -2, 4, 1.8], [-4, 0, 5, 2.2], [14, -3, 3.4, 1.6]]) boxOut(cream, { x0: x - w / 2, x1: x + w / 2, y0: P.roofY, y1: P.roofY + h, z0: z - 1.6, z1: z + 1.6 }, new THREE.Color("#DAD6CC"));

  const mk = (acc, material, withColor, withUv) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3));
    if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2));
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = true; return m;
  };
  const creamMesh = mk(cream, materials.cream, true), glassMesh = mk(glass, materials.glass, false, true), darkMesh = mk(dark, materials.dark, false);
  const redMesh = mk(red, materials.red, false); redMesh.castShadow = false;
  g.add(creamMesh, glassMesh, darkMesh, redMesh); g.position.set(place.x, 0, place.z); g.rotation.y = place.rot; g.scale.setScalar(o.scale);
  return { group: g, glass: glassMesh, cream: creamMesh, dark: darkMesh, height: P.height * o.scale };
}

/** Footprint corners in image px for a model centred at `center` (px), local +x pointing along `dir` (unit, px) and +z along `front`. */
export function adelsonFootprint(center, dir, front, o = ADELSON) {
  const pxm = o.scale / K;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [center[0] + (sx * o.length / 2 * dir[0] + sz * o.depth / 2 * front[0]) * pxm, center[1] + (sx * o.length / 2 * dir[1] + sz * o.depth / 2 * front[1]) * pxm]);
}
