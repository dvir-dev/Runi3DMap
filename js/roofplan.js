// Pure, deterministic roof plan per building: flat roof with a parapet and a few rooftop props, or a hip roof for small buildings.
import { pointInPoly, K } from "./geo.js";

const PX_PER_M = 1 / K;
export const PROP_KINDS = ["ahu", "fan", "stack"];   // air-handling unit (louvre band), roof fan (dark fan deck), unit with an exhaust stack: picked by building id and unit number so the layout above does not move
const rngFor = id => { let a = (id * 2654435761 + 1013904223) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const edgeDist = ([x, y], poly) => {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length], dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
  }
  return best;
};

/** @returns {{kind:"flat"|"hip", parapet:number, props:{x:number,y:number,w:number,d:number,h:number,kind:string}[]}} x,y = image px centre; w,d,h = metres */
export function roofPlan(b) {
  if (b.roof === "flat") return { kind: "flat", parapet: 0.6, props: [] };
  if (b.roof === "hip" || b.parent == null && b.area < 9000) return { kind: "hip", parapet: 0, props: [] };
  if (b.parent != null) return { kind: "flat", parapet: 0.8, props: [] };
  const rnd = rngFor(b.id), xs = b.poly.map(p => p[0]), ys = b.poly.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const want = b.machinery ?? Math.min(3, Math.floor(b.area / 9000) + Math.floor(rnd() * 2)), props = [];   // b.machinery: a hand-set number of units (the Arison / computer-science roofs are full of air-handling plant)
  for (let n = 0; n < want; n++) {
    const w = 2 + rnd() * 2.5, d = 2 + rnd() * 2.5, h = 1.2 + rnd() * 1.2, clear = (Math.max(w, d) / 2 + 2) * PX_PER_M;
    for (let tries = 0; tries < 40; tries++) {
      const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
      if (pointInPoly(p, b.poly) && edgeDist(p, b.poly) >= clear && props.every(q => Math.hypot(q.x - p[0], q.y - p[1]) > 6 * PX_PER_M)) { props.push({ x: p[0], y: p[1], w, d, h, kind: PROP_KINDS[(b.id + n) % PROP_KINDS.length] }); break; }
    }
  }
  return { kind: "flat", parapet: 0.8, props };
}
