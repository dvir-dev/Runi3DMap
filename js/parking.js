// The faculty & permit-holder parking lot (entry 1): asphalt, painted bays in two rows around one drive aisle, a "P" sign,
// and only a few parked cars (this lot is mostly empty). Layout is pure and deterministic; createParking builds the meshes.
import { K } from "./geo.js";

export const SPOT_W = 8.4, SPOT_L = 16, AISLE = 17;            // metres: drawn about twice life size so bays and cars read next to the buildings
const CAR_SCALE = 2.8;
const CAR_COLORS = ["#F4F4F4", "#C9CCD1", "#2B2E36", "#1F3F7A", "#B3261E", "#6D7B8D", "#E2E2E2", "#3E6B4F"];

const rng = seed => { let a = (seed * 2654435761 + 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/**
 * @param cfg {spots: bays per row, rows: even number, occupied: cars, seed}
 * Local metres: x along the lot, z across it (z>0 = front). Rows come in banks: [row facing down][aisle][row facing up], banks side by side.
 */
export function parkingLayout({ spots, rows, occupied, seed }) {
  const r = rng(seed), list = [], aisles = [], D = rows * SPOT_L + (rows / 2) * AISLE;
  let z = -D / 2, rowIndex = 0;
  for (let bank = 0; bank < rows / 2; bank++) {
    for (const down of [true, false]) {
      const zc = z + SPOT_L / 2; for (let i = 0; i < spots; i++) list.push({ x: (i - (spots - 1) / 2) * SPOT_W, z: zc, rot: down ? 0 : Math.PI, row: rowIndex }); rowIndex++;
      z += SPOT_L; if (down) { aisles.push({ z: z + AISLE / 2 }); z += AISLE; }
    }
  }
  const perRow = Math.floor(occupied / rows), picked = [];                    // the same number of cars in every row
  for (let row = 0; row < rows; row++) { const idx = list.map((s, i) => (s.row === row ? i : -1)).filter(i => i >= 0); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } picked.push(...idx.slice(0, perRow)); }
  const cars = picked.sort((a, b) => a - b).map(spot => { const s = list[spot]; return { spot, x: s.x + (r() - 0.5) * 0.3, z: s.z + (r() - 0.5) * 0.7, rot: s.rot + (r() - 0.5) * 0.1, color: Math.floor(r() * CAR_COLORS.length) }; });
  return { spots: list, cars, aisles, size: { w: spots * SPOT_W, d: D } };
}

function carGeometry(THREE) {
  const parts = [[1.9, 0.62, 4.4, 0, 0.62, 0, "#FFFFFF"], [1.62, 0.55, 2.3, 0, 1.2, -0.15, "#2B3A55"],
    ...[[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].map(([sx, z]) => [0.22, 0.55, 0.62, sx * 0.97, 0.3, z, "#1A1A1F"]),
    ...[-1, 1].map(sx => [0.4, 0.16, 0.08, sx * 0.65, 0.72, 2.2, "#FFE9A8"]), ...[-1, 1].map(sx => [0.4, 0.16, 0.08, sx * 0.65, 0.72, -2.2, "#D63A3A"])];
  const pos = [], col = [];
  for (const [w, h, d, x, y, z, hex] of parts) { const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed(), c = new THREE.Color(hex); pos.push(...g.attributes.position.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b); }
  const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); m.computeVertexNormals(); return m;
}

export function createParking(THREE, cfg, W, H) {
  const L = parkingLayout(cfg), g = new THREE.Group(); g.name = "parking";
  g.position.set((cfg.center[0] - W / 2) * K, 0, (cfg.center[1] - H / 2) * K); g.rotation.y = -cfg.angle;
  const flat = (w, d, y, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.position.y = y; return m; };
  g.add(flat(L.size.w + 6.8, L.size.d + 6.8, 0.045, 0xdad6ce), flat(L.size.w + 2.4, L.size.d + 2.4, 0.055, 0xb9b6af));           // pale kerb apron, then asphalt
  // painted bay lines (one merged mesh)
  const pos = [], quad = (x0, z0, x1, z1) => pos.push(x0, 0.075, z0, x1, 0.075, z0, x1, 0.075, z1, x0, 0.075, z0, x1, 0.075, z1, x0, 0.075, z1);
  for (const rowZ of [...new Set(L.spots.map(sp => sp.z))]) { const z0 = rowZ - SPOT_L / 2, z1 = rowZ + SPOT_L / 2; for (let i = 0; i <= cfg.spots; i++) { const x = (i - cfg.spots / 2) * SPOT_W; quad(x - 0.16, z0, x + 0.16, z1); } }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const lines = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); g.add(lines);
  // the few parked cars (instanced, tinted per car)
  if (L.cars.length) {
    const im = new THREE.InstancedMesh(carGeometry(THREE), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), L.cars.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    L.cars.forEach((car, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), car.rot); m4.compose(new THREE.Vector3(car.x, 0.07, car.z), q, new THREE.Vector3(CAR_SCALE, CAR_SCALE, CAR_SCALE)); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(CAR_COLORS[car.color])); });
    im.castShadow = true; g.add(im);
  }
  // "P" sign on a pole at the front-left corner
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const x = cv.getContext("2d");
  x.fillStyle = "#00378B"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#fff"; x.font = "bold 96px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("P", 64, 70);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5, 6).translate(0, 2.5, 0), new THREE.MeshLambertMaterial({ color: 0x8a8f9a })), board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.16), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshLambertMaterial(i === 4 ? { map: tex } : { color: 0x00378b })));
  board.position.y = 5.4; const sign = new THREE.Group(); sign.add(pole, board); sign.position.set(-L.size.w / 2 - 5, 0, L.size.d / 2 - 2); sign.rotation.y = 0.5; sign.scale.setScalar(2); sign.traverse(o => { o.castShadow = true; }); g.add(sign);
  return g;
}
