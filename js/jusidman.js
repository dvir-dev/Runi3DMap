// The Daniel Jusidman Conference Center (entry 51), modelled from photos: a rounded two-level pavilion. A ring of tall white columns carries a thin white
// slab; behind them a recessed glazed ground floor with glass doors at the front; above the slab a set-back band of ribbon windows between white mullions;
// a thin roof plate. Outside: pale paving, a low sign block, and big trees.
// Pure helpers work on polygons of [x, z] (metres); createJusidman builds the meshes from a world-space outline.
export const JUSIDMAN = { colH: 6, slabT: 0.7, bandH: 3.2, roofT: 0.55, colSize: 0.55, colGap: 3.3, glassInset: 2.8, bandInset: 3.4, slabOver: 0.5, roofInset: 2.6 };
export const JUSIDMAN_SCALE = 1.15;                                      // drawn a little taller (and its outline in the data a little bigger) than the first model
export const JUSIDMAN_HEIGHT = (JUSIDMAN.colH + JUSIDMAN.slabT + JUSIDMAN.bandH + JUSIDMAN.roofT) * JUSIDMAN_SCALE;

const centroid = pts => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
/** Moves every vertex of a (smooth, roughly convex) outline outwards by d metres (inwards when d < 0), mitred. */
export function offsetPolygon(pts, d) {
  const n = pts.length, c = centroid(pts), edgeN = i => { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
  const mid = pts[0].map((_, k) => (pts[0][k] + pts[1][k]) / 2), flip = (edgeN(0)[0] * (mid[0] - c[0]) + edgeN(0)[1] * (mid[1] - c[1])) < 0 ? -1 : 1;     // make the normals point away from the centre
  return pts.map((p, i) => {
    const a = edgeN((i + n - 1) % n), b = edgeN(i), vx = (a[0] + b[0]) * flip, vz = (a[1] + b[1]) * flip, l = Math.hypot(vx, vz) || 1, nx = vx / l, nz = vz / l, k = Math.max(0.35, nx * b[0] * flip + nz * b[1] * flip);
    return [p[0] + nx * d / k, p[1] + nz * d / k];
  });
}
export const perimeter = pts => pts.reduce((s, p, i) => s + Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]), 0);
/** Evenly spaced points along the outline: {x, z, tx, tz} (position and unit tangent). */
export function columnPositions(pts, gap) {
  const total = perimeter(pts), count = Math.max(3, Math.round(total / gap)), step = total / count, out = []; let edge = 0, run = 0, target = step / 2;
  for (let k = 0; k < count; k++) {
    for (;;) { const a = pts[edge % pts.length], b = pts[(edge + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (run + l >= target || edge > 4 * pts.length) { const t = (target - run) / (l || 1); out.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / (l || 1), tz: (b[1] - a[1]) / (l || 1) }); break; } run += l; edge++; }
    target += step;
  }
  return out;
}

/** Where the name sign stands: `gap` m beyond the outline's extreme point towards `toward` (a world [x, z], e.g. the library), facing it. @returns {{x, z, face: [x, z]}} */
export function jusidmanSign(outline, toward, gap = 7) {
  const m = centroid(outline), d = Math.hypot(toward[0] - m[0], toward[1] - m[1]), face = [(toward[0] - m[0]) / d, (toward[1] - m[1]) / d];
  const tip = outline.reduce((b, p) => (p[0] * face[0] + p[1] * face[1] > b[0] * face[0] + b[1] * face[1] ? p : b), outline[0]);
  return { x: tip[0] + face[0] * gap, z: tip[1] + face[1] * gap, face };
}

/** outline: world [x, z] points; front: unit [x, z] direction the entrance faces; materials: {cream, glass, band, dark, sign}. Returns {group, wall, cream, height}. */
export function createJusidman(THREE, outline, front, materials, signToward) {
  const o = JUSIDMAN, g = new THREE.Group(), cream = { p: [], c: [] }, glass = { p: [], uv: [] }, band = { p: [], uv: [] }, dark = { p: [] };
  const white = new THREE.Color("#DAD6CB"), shade = s => white.clone().multiplyScalar(s);
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); if (acc.c && col) for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col, uvs) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); if (uvs) acc.uv.push(...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]); };
  const middle = centroid(outline);
  const walls = (acc, poly, y0, y1, col, scale) => {                                  // vertical faces, wound so they face outwards (flat shading + two-sided materials need a correct winding)
    let run = 0;
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]), outward = (-(q[1] - p[1])) * ((p[0] + q[0]) / 2 - middle[0]) + (q[0] - p[0]) * ((p[1] + q[1]) / 2 - middle[1]) > 0;
      const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]], C = [q[0], y1, q[1]], D = [p[0], y1, p[1]], uv = scale && [[run / scale, y0 / 4], [(run + l) / scale, y0 / 4], [(run + l) / scale, y1 / 4], [run / scale, y1 / 4]];
      if (outward) quad(acc, A, B, C, D, col, uv); else quad(acc, B, A, D, C, col, uv && [uv[1], uv[0], uv[3], uv[2]]);
      run += l;
    });
  };
  const plate = (poly, y0, y1, col) => {                                           // a thin slab: top face, underside and edge
    const idx = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), []);
    const facing = (acc, A, B, C, up, col) => { const ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]); tri(acc, A, ...((ny > 0) === up ? [B, C] : [C, B]), col); };
    for (const [a, b, c] of idx) { const P3 = y => [[poly[a][0], y, poly[a][1]], [poly[b][0], y, poly[b][1]], [poly[c][0], y, poly[c][1]]]; facing(cream, ...P3(y1), true, shade(1)); facing(cream, ...P3(y0), false, shade(0.8)); }
    walls(cream, poly, y0, y1, col);
  };
  const slabY0 = o.colH, slabY1 = o.colH + o.slabT, bandY1 = slabY1 + o.bandH;
  walls(glass, offsetPolygon(outline, -o.glassInset), 0.2, o.colH, white, 1.8);                        // recessed ground-floor glazing
  for (const c of columnPositions(outline, o.colGap)) {                                              // the ring of tall white columns
    const a = o.colSize / 2, nx = c.tz, nz = -c.tx, cs = [[-a, -a], [a, -a], [a, a], [-a, a]].map(([u, v]) => [c.x + c.tx * u + nx * v, c.z + c.tz * u + nz * v]);
    walls(cream, cs, 0, o.colH, shade(0.95));
  }
  plate(offsetPolygon(outline, o.slabOver), slabY0, slabY1, shade(0.92));                            // the thin slab over the colonnade
  walls(band, offsetPolygon(outline, -o.bandInset), slabY1, bandY1, white, 1.3);                     // the set-back band of ribbon windows
  plate(offsetPolygon(outline, -o.roofInset + 0.2), bandY1, bandY1 + o.roofT, shade(0.92));          // roof plate
  // front: glass doors and the sign block
  const apex = outline.reduce((b, p) => (p[0] * front[0] + p[1] * front[1] > b[0] * front[0] + b[1] * front[1] ? p : b), outline[0]), tg = [-front[1], front[0]], at = (f, s) => [apex[0] + front[0] * f + tg[0] * s, apex[1] + front[1] * f + tg[1] * s];
  const door = (s0, s1) => { const a = at(-o.glassInset + 0.1, s0), b = at(-o.glassInset + 0.1, s1); quad(dark, [a[0], 0.25, a[1]], [b[0], 0.25, b[1]], [b[0], 4.2, b[1]], [a[0], 4.2, a[1]]); }; door(-2.4, 2.4);
  const box = (acc, x, z, w, d, h, y0 = 0, col) => { const hw = w / 2, hd = d / 2; for (const [p, q] of [[[-hw, -hd], [hw, -hd]], [[hw, -hd], [hw, hd]], [[hw, hd], [-hw, hd]], [[-hw, hd], [-hw, -hd]]]) quad(acc, [x + p[0], y0, z + p[1]], [x + q[0], y0, z + q[1]], [x + q[0], y0 + h, z + q[1]], [x + p[0], y0 + h, z + p[1]], col); quad(acc, [x - hw, y0 + h, z + hd], [x + hw, y0 + h, z + hd], [x + hw, y0 + h, z - hd], [x - hw, y0 + h, z - hd], col); };
  const sign = signToward ? jusidmanSign(outline, signToward) : { x: at(15, 17)[0], z: at(15, 17)[1], face: front };                  // the low white sign block: beside the building, facing the library (or, with no target, out in front)
  const [sx, sz] = [sign.x, sign.z], tgs = [-sign.face[1], sign.face[0]], oc = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [sx + tgs[0] * a * 3 + sign.face[0] * b * 0.3, sz + tgs[1] * a * 3 + sign.face[1] * b * 0.3]);
  for (let i = 0; i < 4; i++) { const P = oc[i], Q = oc[(i + 1) % 4]; quad(cream, [P[0], 0, P[1]], [Q[0], 0, Q[1]], [Q[0], 1.3, Q[1]], [P[0], 1.3, P[1]], shade(1)); }
  quad(cream, [oc[0][0], 1.3, oc[0][1]], [oc[1][0], 1.3, oc[1][1]], [oc[2][0], 1.3, oc[2][1]], [oc[3][0], 1.3, oc[3][1]], shade(1.05));
  const mk = (acc, material, withColor, withUv, shadow = true) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); if (withColor) geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); if (withUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
  const creamMesh = mk(cream, materials.cream, true), glassMesh = mk(glass, materials.glass, false, true), bandMesh = mk(band, materials.band, false, true);
  g.add(creamMesh, glassMesh, bandMesh, mk(dark, materials.dark));
  if (materials.sign) { const s = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), materials.sign); const n = Math.atan2(sign.face[0], sign.face[1]); s.position.set(sx + sign.face[0] * 0.32, 0.75, sz + sign.face[1] * 0.32); s.rotation.y = n; g.add(s); }
  g.scale.y = JUSIDMAN_SCALE;
  return { group: g, wall: bandMesh, cream: creamMesh, height: JUSIDMAN_HEIGHT };
}
