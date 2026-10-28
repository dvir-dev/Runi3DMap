// The "I ♥ RUNI" photo sign (Reichman University): big white standing letters with a blue heart for the love, on the road beside the lawn, facing the Hangar.
// runSignLayout() is the pure layout in local metres (x along the row, y up, z toward the front); createRunSign builds the meshes. Drawn 1.6x life size so it reads on the map.
import { K } from "./geo.js";

export const RUNSIGN = { height: 3.4, depth: 0.55, stroke: 0.6, gap: 0.8, scale: 1 };

/** @returns {{boxes: {x, y, w, h, rot, kind}[], heart: {x, y, w, h}, width: number}} boxes are centred (x along the row, y up), rot = rotation about the depth axis (rad). */
export function runSignLayout() {
  const o = RUNSIGN, H = o.height, s = o.stroke, boxes = [];
  const bar = (x, y, w, h, kind = "white") => boxes.push({ x, y, w, h, rot: 0, kind });
  const diag = (x0, y0, x1, y1) => boxes.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(x1 - x0, y1 - y0), h: s, rot: Math.atan2(y1 - y0, x1 - x0), kind: "white" });
  let x = 0; const next = w => { const l = x; x += w + o.gap; return l; };
  { const l = next(1.7); bar(l + 0.85, H / 2, s, H); bar(l + 0.85, H - 0.28, 1.7, 0.56); bar(l + 0.85, 0.28, 1.7, 0.56); }                       // I (with its serifs)
  const heartX = next(3.2);
  { const l = next(2.5), mid = H * 0.52; bar(l + s / 2, H / 2, s, H); bar(l + 1.25, H - s / 2, 2.5, s); bar(l + 1.25, mid, 2.5, s); bar(l + 2.5 - s / 2, (mid + H) / 2, s, H - mid); diag(l + 0.9, mid, l + 2.3, 0); }   // R
  { const l = next(2.4); bar(l + s / 2, H / 2, s, H); bar(l + 2.4 - s / 2, H / 2, s, H); bar(l + 1.2, s / 2, 2.4, s); }                           // U
  { const l = next(2.6); bar(l + s / 2, H / 2, s, H); bar(l + 2.6 - s / 2, H / 2, s, H); diag(l + s / 2, H - 0.3, l + 2.6 - s / 2, 0.3); }          // N
  { const l = next(1.7); bar(l + 0.85, H / 2, s, H); bar(l + 0.85, H - 0.28, 1.7, 0.56); bar(l + 0.85, 0.28, 1.7, 0.56); }                       // the final I: "I ♥ RUNI", as on the real sign (RUNI = Reichman University)
  const width = x - o.gap, shift = -width / 2;
  for (const b of boxes) b.x += shift;
  return { boxes, heart: { x: heartX + 1.6 + shift, y: 0.2 + 1.5, w: 3.0, h: 3.0 }, width };
}

/** cfg: {at: [px, py], toward: [px, py]} (image px): where it stands, and what it faces. */
export function createRunSign(THREE, cfg, W, H) {
  const o = RUNSIGN, L = runSignLayout(), g = new THREE.Group(), wx = x => (x - W / 2) * K, wz = y => (y - H / 2) * K;
  const white = new THREE.MeshLambertMaterial({ color: "#F4F2EC", flatShading: true });
  for (const b of L.boxes) { const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, o.depth), white); m.position.set(b.x, b.y, 0); m.rotation.z = b.rot; m.castShadow = true; g.add(m); }
  const t = Math.PI / 2, pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([16 * Math.sin(a) ** 3, 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)]); }
  const sc = L.heart.w / 34, shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * sc, y * sc)));
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: "#2146A6", flatShading: true }));
  heart.position.set(L.heart.x, L.heart.y - 0.2, -o.depth / 2); heart.castShadow = true; g.add(heart);
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const c2 = cv.getContext("2d");
  if (c2.fillText) { c2.fillStyle = "#FFFFFF"; c2.textAlign = "center"; c2.font = "bold 40px system-ui, sans-serif"; c2.fillText("Reichman", 128, 60); c2.font = "bold 30px system-ui, sans-serif"; c2.fillText("University", 128, 100); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); label.position.set(L.heart.x, L.heart.y - 0.1, o.depth / 2 + 0.02); g.add(label);
  const dx = cfg.toward[0] - cfg.at[0], dy = cfg.toward[1] - cfg.at[1], d = Math.hypot(dx, dy);
  g.position.set(wx(cfg.at[0]), 0, wz(cfg.at[1])); g.rotation.y = Math.atan2(dx / d, dy / d); g.scale.setScalar(o.scale);
  return g;
}
