// Walking directions: the route drawn on the ground (a blue ribbon with a white edge, a dot at the start) and its length / time. routeStats and ribbonQuads are pure.
import { K } from "./geo.js";

export const WALK_M_PER_MIN = 80;                       // a relaxed campus walking pace (about 4.8 km/h)
export const ROUTE = { width: 2.6, casing: 1.1, y: 0.42 };

/** @returns {{meters: number, minutes: number}} for a path of image-px points */
export function routeStats(path) {
  let px = 0; for (let i = 1; i < path.length; i++) px += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  const meters = Math.round(px * K); return { meters, minutes: Math.max(1, Math.ceil(meters / WALK_M_PER_MIN)) };
}

/** One quad per segment of a polyline of world [x, z] points, `width` wide, its ends pushed out by half a width so neighbours overlap; and a disc centre at every interior vertex. */
export function ribbonQuads(pts, width) {
  const quads = [], discs = [], h = width / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 1e-6) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz * h, nz = ux * h, ex = ux * h, ez = uz * h;
    quads.push([ax - ex + nx, az - ez + nz, bx + ex + nx, bz + ez + nz, bx + ex - nx, bz + ez - nz, ax - ex - nx, az - ez - nz]);
  }
  for (let i = 1; i + 1 < pts.length; i++) discs.push(pts[i]);
  return { quads, discs };
}

export function createRoute(THREE, W, H) {
  const group = new THREE.Group(), wx = x => (x - W / 2) * K, wz = y => (y - H / 2) * K;
  const mats = { casing: new THREE.MeshBasicMaterial({ color: "#FFFFFF", polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), line: new THREE.MeshBasicMaterial({ color: "#1B63F2", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }) };
  let meshes = [];
  const flat = (pts, width, mat, y) => {
    const { quads, discs } = ribbonQuads(pts, width), pos = [];
    for (const q of quads) pos.push(q[0], y, q[1], q[2], y, q[3], q[4], y, q[5], q[0], y, q[1], q[4], y, q[5], q[6], y, q[7]);
    for (const [cx, cz] of discs) for (let k = 0; k < 10; k++) { const a0 = k / 10 * Math.PI * 2, a1 = (k + 1) / 10 * Math.PI * 2, r = width / 2; pos.push(cx, y, cz, cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.material.side = THREE.DoubleSide; m.renderOrder = 3; return m;
  };
  const dot = (p, r, mat, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat); m.rotation.x = -Math.PI / 2; m.position.set(p[0], y, p[1]); m.material.side = THREE.DoubleSide; m.renderOrder = 4; return m; };
  function clear() { for (const m of meshes) { group.remove(m); m.geometry.dispose(); } meshes = []; }
  /** path: image-px points. Returns the world-space bounds {x0, z0, x1, z1}. */
  function set(path) {
    clear(); const pts = path.map(([x, y]) => [wx(x), wz(y)]), o = ROUTE;
    meshes.push(flat(pts, o.width + 2 * o.casing, mats.casing, o.y), flat(pts, o.width, mats.line, o.y + 0.04), dot(pts[0], o.width * 1.35 + o.casing, mats.casing, o.y + 0.06), dot(pts[0], o.width * 1.35, mats.line, o.y + 0.1));
    for (const m of meshes) group.add(m);
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]); return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) };
  }
  return { group, set, clear };
}
