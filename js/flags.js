// Flag Plaza (רחבת הדגלים): two parallel rows of flagpoles along the green strip beside the Economics & Psychology building, set back from the path.
// Israel's flag leads the first row; the others are friendly countries and organisations (no hostile states). The flags wave in the wind (a vertex shader, driven by one time uniform). Layout is pure and deterministic; createFlags builds the meshes.
import { K } from "./geo.js";

/** flag designs, drawn on a 96x64 canvas by drawFlag */
export const DESIGNS = [
  ["fr", "v", ["#0055A4", "#FFFFFF", "#EF4135"]], ["it", "v", ["#009246", "#FFFFFF", "#CE2B37"]], ["ie", "v", ["#169B62", "#FFFFFF", "#FF883E"]],
  ["ro", "v", ["#002B7F", "#FCD116", "#CE1126"]], ["be", "v", ["#1A1A1A", "#FAE042", "#ED2939"]], ["mx", "v", ["#006847", "#FFFFFF", "#CE1126"], "dot"],
  ["de", "h", ["#1A1A1A", "#DD0000", "#FFCE00"]], ["nl", "h", ["#AE1C28", "#FFFFFF", "#21468B"]], ["hu", "h", ["#CE2939", "#FFFFFF", "#477050"]],
  ["bg", "h", ["#FFFFFF", "#00966E", "#D62612"]], ["at", "h", ["#ED2939", "#FFFFFF", "#ED2939"]], ["lt", "h", ["#FDB913", "#006A44", "#C1272D"]],
  ["ee", "h", ["#0072CE", "#1A1A1A", "#FFFFFF"]], ["pl", "h", ["#FFFFFF", "#DC143C"]], ["ua", "h", ["#0057B7", "#FFD700"]], ["co", "h", ["#FCD116", "#FCD116", "#003893", "#CE1126"]],
  ["es", "h", ["#AA151B", "#F1BF00", "#F1BF00", "#AA151B"]], ["ar", "h", ["#74ACDF", "#FFFFFF", "#74ACDF"], "sun"],
  ["se", "cross", ["#006AA7", "#FECC00"]], ["dk", "cross", ["#C8102E", "#FFFFFF"]], ["fi", "cross", ["#FFFFFF", "#003580"]], ["ch", "plus", ["#D52B1E", "#FFFFFF"]],
  ["il", "il", []], ["gb", "union", []], ["us", "us", []], ["gr", "gr", []], ["jp", "disc", ["#FFFFFF", "#BC002D"]], ["br", "br", []], ["ca", "ca", []], ["au", "au", []], ["eu", "eu", []], ["in", "in", []], ["cz", "cz", []],
];

const hash = i => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

/** Pure: pole positions and which design hangs on each. cfg: {edge:{x0,y0,slope}, insets:[px…], yN, yS, count, poleH, flagW, flagH} (image px, metres) */
export function flagLayout(cfg, W, H) {
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K, edge = y => cfg.edge.x0 + cfg.edge.slope * (y - cfg.edge.y0);
  const il = DESIGNS.findIndex(d => d[0] === "il"), poles = [], order = DESIGNS.map((_, i) => i).filter(i => i !== il).sort((a, b) => hash(a * 7 + 3) - hash(b * 7 + 3));
  cfg.insets.forEach((inset, r) => {
    for (let i = 0; i < cfg.count; i++) {
      const y = cfg.yN + (cfg.yS - cfg.yN) * (i + (r % 2) * 0.5) / (cfg.count - 1 + 0.5), x = edge(y) - inset;
      poles.push({ px: [x, y], x: wx(x), z: wz(y), design: r === 0 && i === 0 ? il : order[(i + r * 11) % order.length], turn: (hash(i * 5 + r) - 0.5) * 0.5 });
    }
  });
  const widest = Math.max(...cfg.insets);
  const zonePx = [[edge(cfg.yN - 20) - widest - 24, cfg.yN - 20], [edge(cfg.yN - 20) + 4, cfg.yN - 20], [edge(cfg.yS + 20) + 4, cfg.yS + 20], [edge(cfg.yS + 20) - widest - 24, cfg.yS + 20]];
  return { poles, zonePx, poleH: cfg.poleH, flagW: cfg.flagW, flagH: cfg.flagH };
}

function drawFlag(THREE, d) {
  const [, kind, c] = d, cv = document.createElement("canvas"); cv.width = 96; cv.height = 64; const g = cv.getContext("2d"), w = 96, h = 64;
  const fill = (col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const circle = (col, x, y, r) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  if (kind === "v") c.forEach((col, i) => fill(col, w * i / c.length, 0, w / c.length + 1, h));
  else if (kind === "h") { const parts = c.length; c.forEach((col, i) => fill(col, 0, h * i / parts, w, h / parts + 1)); }
  else if (kind === "cross") { fill(c[0], 0, 0, w, h); fill(c[1], 28, 0, 14, h); fill(c[1], 0, 25, w, 14); }
  else if (kind === "plus") { fill(c[0], 0, 0, w, h); fill(c[1], 41, 12, 14, 40); fill(c[1], 28, 25, 40, 14); }
  else if (kind === "disc") { fill(c[0], 0, 0, w, h); circle(c[1], 48, 32, 18); }
  else if (kind === "union") { fill("#012169", 0, 0, w, h); g.strokeStyle = "#FFFFFF"; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.strokeStyle = "#C8102E"; g.lineWidth = 4; g.stroke(); fill("#FFFFFF", 38, 0, 20, h); fill("#FFFFFF", 0, 22, w, 20); fill("#C8102E", 42, 0, 12, h); fill("#C8102E", 0, 26, w, 12); }
  else if (kind === "il") { fill("#FFFFFF", 0, 0, w, h); fill("#0038B8", 0, 6, w, 8); fill("#0038B8", 0, 50, w, 8); g.strokeStyle = "#0038B8"; g.lineWidth = 2.6; for (const s of [1, -1]) { g.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (s > 0 ? 0 : Math.PI / 3) + k * 2 * Math.PI / 3; const x = 48 + 13 * Math.cos(a), y = 32 + 13 * Math.sin(a); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); } }
  else if (kind === "us") { for (let i = 0; i < 13; i++) fill(i % 2 ? "#FFFFFF" : "#B22234", 0, h * i / 13, w, h / 13 + 1); fill("#3C3B6E", 0, 0, 42, h * 7 / 13); }
  else if (kind === "gr") { for (let i = 0; i < 9; i++) fill(i % 2 ? "#FFFFFF" : "#0D5EAF", 0, h * i / 9, w, h / 9 + 1); fill("#0D5EAF", 0, 0, 34, 29); fill("#FFFFFF", 14, 0, 6, 29); fill("#FFFFFF", 0, 11, 34, 6); }
  else if (kind === "br") { fill("#009C3B", 0, 0, w, h); g.fillStyle = "#FFDF00"; g.beginPath(); g.moveTo(48, 6); g.lineTo(90, 32); g.lineTo(48, 58); g.lineTo(6, 32); g.fill(); circle("#002776", 48, 32, 14); }
  else if (kind === "ca") { fill("#FFFFFF", 0, 0, w, h); fill("#D52B1E", 0, 0, 24, h); fill("#D52B1E", 72, 0, 24, h); g.fillStyle = "#D52B1E"; g.beginPath(); g.moveTo(48, 14); g.lineTo(60, 32); g.lineTo(48, 50); g.lineTo(36, 32); g.fill(); }
  else if (kind === "au") { fill("#012169", 0, 0, w, h); fill("#FFFFFF", 0, 0, 44, 30); fill("#C8102E", 20, 0, 4, 30); fill("#C8102E", 0, 13, 44, 4); for (const [x, y] of [[22, 46], [62, 14], [78, 30], [62, 50], [54, 32]]) circle("#FFFFFF", x, y, 3); }
  else if (kind === "eu") { fill("#003399", 0, 0, w, h); for (let i = 0; i < 12; i++) circle("#FFCC00", 48 + 20 * Math.cos(i / 12 * 6.283), 32 + 20 * Math.sin(i / 12 * 6.283), 3); }
  else if (kind === "in") { fill("#FF9933", 0, 0, w, h / 3 + 1); fill("#FFFFFF", 0, h / 3, w, h / 3 + 1); fill("#138808", 0, 2 * h / 3, w, h / 3 + 1); g.strokeStyle = "#000080"; g.lineWidth = 2; g.beginPath(); g.arc(48, 32, 8, 0, 7); g.stroke(); }
  else if (kind === "cz") { fill("#FFFFFF", 0, 0, w, h / 2); fill("#D7141A", 0, h / 2, w, h / 2); g.fillStyle = "#11457E"; g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 32); g.lineTo(0, 64); g.fill(); }
  if (d[3] === "dot") circle("#8B5A2B", 48, 32, 8); if (d[3] === "sun") circle("#F6B40E", 48, 32, 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Waving: each flag swings a little about its pole and ripples more towards its free end. `time` is shared by every flag. */
function wave(material, time, flagW) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader.replace("void main() {", "uniform float uTime;\nvoid main() {").replace("#include <begin_vertex>", `#include <begin_vertex>
  float k = clamp((position.x - 0.1) / ${flagW.toFixed(2)}, 0.0, 1.0);
  float ph = (modelMatrix[3].x + modelMatrix[3].z) * 0.45;
  float sw = sin(uTime * 0.8 + ph) * 0.28 + sin(uTime * 1.9 + ph * 2.0) * 0.07;
  transformed.xz = mat2(cos(sw), sin(sw), -sin(sw), cos(sw)) * transformed.xz;
  transformed.z += (sin(uTime * 3.4 - position.x * 2.4 + ph) * 0.42 + sin(uTime * 5.1 - position.x * 4.0 + ph) * 0.12) * k;
  transformed.y += sin(uTime * 2.6 - position.x * 3.1 + ph) * 0.14 * k - 0.1 * k * k;`);
  };
  material.customProgramCacheKey = () => "flagwave";
}

export function createFlags(THREE, cfg, W, H) {
  const L = flagLayout(cfg, W, H), g = new THREE.Group(), time = { value: 0 };
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.18, L.poleH, 6).translate(0, L.poleH / 2, 0), new THREE.MeshLambertMaterial({ color: 0xF2F0EA, flatShading: true }), L.poles.length), m4 = new THREE.Matrix4();
  L.poles.forEach((p, i) => { m4.makeTranslation(p.x, 0, p.z); pole.setMatrixAt(i, m4); });
  pole.castShadow = true; g.add(pole);
  const plane = new THREE.PlaneGeometry(L.flagW, L.flagH, 14, 4).translate(L.flagW / 2 + 0.1, 0, 0), mats = new Map();
  for (const p of L.poles) {
    if (!mats.has(p.design)) { const m = new THREE.MeshBasicMaterial({ map: drawFlag(THREE, DESIGNS[p.design]), side: THREE.DoubleSide }); wave(m, time, L.flagW); mats.set(p.design, m); }
    const f = new THREE.Mesh(plane, mats.get(p.design)); f.position.set(p.x, L.poleH - L.flagH / 2 - 0.2, p.z); f.rotation.y = Math.PI / 2 + p.turn;   // hangs out toward the building, a little different each time
    g.add(f);
  }
  g.userData.zonePx = L.zonePx;
  g.userData.samples = [0, 3, 6, 9, 12, 15, 17].map(i => { const p = L.poles[Math.min(i, cfg.count - 1)]; return new THREE.Vector3(p.x, L.poleH * 0.6, p.z); });   // points along the plaza, for "is it on screen" checks
  g.userData.update = seconds => { time.value = seconds; };
  return g;
}
