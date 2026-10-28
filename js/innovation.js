// The Innovation Centre's extras (entry 49), from photos: a beige panel core up one corner, taller than the glass roof and with dark louvred vents on its two
// outer faces, and a row of slim lamp posts around the building. Pure layout in world metres; buildings.js draws the boxes.
// innovationExtras(pts, coreCorner, roofY) -> [{cx, cz, tx, tz, w, d, ya, yb, color}], each an oriented box: centre, unit tangent, width along it, depth across it.

export const INNOVATION = { floor: 4.4, core: 7.5, coreOut: 0.5, coreRise: 2.6, vent: { w: 3, h: 1.2, floors: [2.2, 6.6, 11, 15.4] }, lampEvery: 14, lampOut: 3, lampH: 5, lampClear: 6 };

const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };

export function innovationExtras(pts, coreCorner, roofY) {
  const o = INNOVATION, out = [], n = pts.length, P = pts[coreCorner], e1 = unit(P, pts[(coreCorner + 1) % n]), e2 = unit(P, pts[(coreCorner + n - 1) % n]);
  const at = (a, b) => [P[0] + e1[0] * a + e2[0] * b, P[1] + e1[1] * a + e2[1] * b];
  const half = o.core / 2 - o.coreOut, c = at(half, half);
  out.push({ cx: c[0], cz: c[1], tx: e1[0], tz: e1[1], w: o.core, d: o.core, ya: 0, yb: roofY + o.coreRise, color: "#D6CDBF" });
  for (const ya of o.vent.floors) {                                                       // a dark louvred vent per floor on each outer face of the core
    const f1 = at(half, -o.coreOut), f2 = at(-o.coreOut, half);
    out.push({ cx: f1[0] - e2[0] * 0.03, cz: f1[1] - e2[1] * 0.03, tx: e1[0], tz: e1[1], w: o.vent.w, d: 0.14, ya, yb: ya + o.vent.h, color: "#6D645A" });
    out.push({ cx: f2[0] - e1[0] * 0.03, cz: f2[1] - e1[1] * 0.03, tx: e2[0], tz: e2[1], w: o.vent.w, d: 0.14, ya, yb: ya + o.vent.h, color: "#6D645A" });
  }
  const lamp = (x, z, tx, tz) => { out.push({ cx: x, cz: z, tx, tz, w: 0.18, d: 0.18, ya: 0, yb: o.lampH, color: "#4A4F57" }, { cx: x, cz: z, tx, tz, w: 0.9, d: 0.45, ya: o.lampH, yb: o.lampH + 0.18, color: "#F2EEDC" }); };
  for (let i = 0; i < n; i++) {                                                                           // lamp posts a few metres out from every wall, clear of the core's corner
    const A = pts[i], B = pts[(i + 1) % n], len = Math.hypot(B[0] - A[0], B[1] - A[1]), t = unit(A, B), count = Math.max(1, Math.round(len / o.lampEvery));
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], cen = pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]);
    let nx = t[1], nz = -t[0]; if (nx * (mid[0] - cen[0]) + nz * (mid[1] - cen[1]) < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < count; k++) {
      const s = len * (k + 0.5) / count, x = A[0] + t[0] * s + nx * o.lampOut, z = A[1] + t[1] * s + nz * o.lampOut;
      if (Math.hypot(x - P[0], z - P[1]) < o.core + o.lampClear) continue;
      lamp(x, z, t[0], t[1]);
    }
  }
  return out;
}
