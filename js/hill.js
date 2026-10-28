// A small grassy hill on the central lawn where students sit, with 3 trees on it.
import { K } from "./geo.js";

/** Height (m) at local coordinates (u, v), where the ellipse rim is at u^2 + v^2 = 1. Zero at and beyond the rim. */
export function hillHeightAt(hill, u, v) {
  const r2 = u * u + v * v;
  return r2 >= 1 ? 0 : hill.height * Math.pow(1 - r2, 1.5);
}

const toPx = (hill, u, v) => { const x = u * hill.rx, y = v * hill.ry, c = Math.cos(hill.angle), s = Math.sin(hill.angle); return [hill.center[0] + x * c - y * s, hill.center[1] + x * s + y * c]; };

/** The three trees standing on the slope: [{c:[px,py], y:metres, r:px}] */
export function hillTreePositions(hill) {
  return [[-0.05, -0.1], [0.42, 0.32], [-0.38, 0.38]].map(([u, v]) => ({ c: toPx(hill, u, v), y: hillHeightAt(hill, u, v) + 0.02, r: 22 }));
}

export function createHill(THREE, hill, W, H) {
  const RINGS = 12, SEGS = 36, wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K, pos = [], idx = [];
  const vertex = (u, v) => { const [px, py] = toPx(hill, u, v); pos.push(wx(px), 0.03 + hillHeightAt(hill, u, v), wz(py)); };
  vertex(0, 0);
  for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEGS; s++) { const rho = r / RINGS, a = s / SEGS * Math.PI * 2; vertex(rho * Math.cos(a), rho * Math.sin(a)); }
  const ring = (r, s) => 1 + (r - 1) * SEGS + (s % SEGS);
  for (let s = 0; s < SEGS; s++) idx.push(0, ring(1, s + 1), ring(1, s));
  for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEGS; s++) { const a = ring(r, s), b = ring(r, s + 1), c = ring(r + 1, s), d = ring(r + 1, s + 1); idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xbcdc84 })); m.name = "hill"; return m;
}
