// The Ofer Lecture Halls (entry 33), modelled from drone footage: a low white building along the path, with a big mono-pitch lecture hall under a dark-blue
// roof at its west end (the end next to the Law School), a taller white stair block in the middle, and a flat-roofed white wing to the east.
// oferParts(L, W) is the pure layout in metres, local x along the building and z across it (z > 0 = the front, the path side); createOfer builds the meshes.
export const OFER = { base: 4.8, hallFront: 6.0, hallBack: 9.4, hallFrac: 0.4, stairH: 7.0, wingFront: 5.4, wingBack: 8.2, linkH: 3.7, rim: 0.5 };

/** @returns {{wedges: object[], boxes: object[], windows: object[], height: number}} boxes {x0,x1,z0,z1,y0,y1,kind}; wedges are the two sloping blue-roofed halls (west hall and east wing) {x0,x1,z0,z1,yFront,yBack}; windows are dark bands {x0,x1,z,y0,y1,face}. */
export function oferParts(L, W) {
  const o = OFER, hx = -L / 2 + o.hallFrac * L, sx0 = hx + 0.02 * L, sx1 = sx0 + 0.17 * L;
  const wedges = [{ x0: -L / 2, x1: hx, z0: -W / 2, z1: W / 2, yFront: o.hallFront, yBack: o.hallBack }, { x0: sx1, x1: L / 2, z0: -W / 2, z1: W / 2, yFront: o.wingFront, yBack: o.wingBack }];   // the east wing has the same blue mono-pitch roof, rising at the back
  const boxes = [
    { x0: sx0, x1: sx1, z0: -W / 2, z1: 0.15 * W, y0: 0, y1: o.stairH, kind: "stair" },                      // the stair / lobby block, taller than the wings
    { x0: hx, x1: sx0, z0: -W / 2, z1: W / 2, y0: 0, y1: o.base, kind: "wall" },                              // the joint between the hall and the stair block
    { x0: sx0, x1: sx1, z0: 0.15 * W, z1: W / 2, y0: 0, y1: o.linkH, kind: "link" },                          // a low front link: the entrance
  ];
  const windows = [
    { x0: sx0 + 1.2, x1: sx1 - 1.2, z: W / 2, y0: 0.2, y1: 2.9, face: "front" },                              // the entrance glazing
    { x0: sx1 + 1.5, x1: L / 2 - 1.5, z: W / 2, y0: 1.4, y1: 3.4, face: "front" }, { x0: sx1 + 1.5, x1: L / 2 - 1.5, z: -W / 2, y0: 1.4, y1: 3.4, face: "back" },   // the wing's ribbon windows
    { x0: -L / 2 + 2, x1: hx - 2, z: W / 2, y0: 1.2, y1: 2.6, face: "front" },                                // low windows under the hall's front edge
  ];
  return { wedges, boxes, windows, height: Math.max(o.hallBack, o.wingBack) };
}

/** outline: unused (the model is a rectangle: place = {x, z, rot}); L, W metres. materials: {cream (vertex colours), glass (vertex colours)} */
export function createOfer(THREE, place, L, W, materials) {
  const o = OFER, P = oferParts(L, W), g = new THREE.Group(), cream = { p: [], c: [] }, glass = { p: [], c: [] };
  const white = new THREE.Color("#ECEBE4"), blue = new THREE.Color("#2B4F98"), dark = new THREE.Color("#2A3447"), shade = [1, 0.86, 0.92, 0.8, 0.7];   // top, front (+z), +x, back (-z), -x
  const tri = (acc, a, b, c, col) => { acc.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) acc.c.push(col.r, col.g, col.b); };
  const quad = (acc, a, b, c, d, col) => { tri(acc, a, b, c, col); tri(acc, a, c, d, col); };
  const box = (b, col) => {
    const { x0, x1, z0, z1, y0, y1 } = b, V = (x, y, z) => [x, y, z], s = (k) => col.clone().multiplyScalar(shade[k]);
    quad(cream, V(x0, y1, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y1, z1), s(0));                           // top
    quad(cream, V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), s(1)); quad(cream, V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), s(2));
    quad(cream, V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), s(3)); quad(cream, V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), s(4));
  };
  for (const b of P.boxes) box(b, white);
  for (const w of P.wedges) {                                                                                 // the lecture hall: white walls, a sloping white fascia and the dark-blue roof set into it
    const { x0, x1, z0, z1, yFront: f, yBack: k } = w, s = i => white.clone().multiplyScalar(shade[i]);
    quad(cream, [x0, 0, z1], [x1, 0, z1], [x1, f, z1], [x0, f, z1], s(1)); quad(cream, [x1, 0, z0], [x0, 0, z0], [x0, k, z0], [x1, k, z0], s(3));
    for (const [x, i, a, b] of [[x1, 2, [x1, 0, z1], [x1, 0, z0]], [x0, 4, [x0, 0, z0], [x0, 0, z1]]]) { const yf = f, yb = k; quad(cream, a, b, [x, yb, z0], [x, yf, z1], s(i)); }
    quad(cream, [x0, k, z0], [x1, k, z0], [x1, f, z1], [x0, f, z1], white);                                   // the sloping roof slab (white rim)
    const i = o.rim, yAt = z => k + (f - k) * (z - z0) / (z1 - z0);
    quad(cream, [x0 + i, yAt(z0 + i) + 0.04, z0 + i], [x1 - i, yAt(z0 + i) + 0.04, z0 + i], [x1 - i, yAt(z1 - i) + 0.04, z1 - i], [x0 + i, yAt(z1 - i) + 0.04, z1 - i], blue);   // the blue roof panel
  }
  for (const w of P.windows) { const d = w.face === "front" ? 0.06 : -0.06; quad(glass, [w.x0, w.y0, w.z + d], [w.x1, w.y0, w.z + d], [w.x1, w.y1, w.z + d], [w.x0, w.y1, w.z + d], dark); }
  const mk = (acc, material) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(acc.p, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(acc.c, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.castShadow = true; return m; };
  const creamMesh = mk(cream, materials.cream), glassMesh = mk(glass, materials.glass); g.add(creamMesh, glassMesh);
  g.position.set(place.x, 0, place.z); g.rotation.y = place.rot;
  return { group: g, wall: glassMesh, glass: glassMesh, cream: creamMesh, height: P.height };
}
