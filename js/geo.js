// Pure geometry helpers shared by the browser app, the offline tools and the tests (no three.js here).
export const K = 1 / 6;                                         // world units (~metres) per image pixel
export const DEFAULT_VIEW = { yaw: Math.PI / 4, pitch: 35 * Math.PI / 180 };

/** Integer image-px rect covering every building vertex and entry anchor, plus a margin (default 60 m). */
export function tileBounds(data, marginPx = 360) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const b of data.buildings) for (const [x, y] of b.poly) add(x, y);
  for (const e of data.entries) if (e.anchor) add(e.anchor[0], e.anchor[1]);
  return {
    x0: Math.max(0, Math.floor(x0 - marginPx)), y0: Math.max(0, Math.floor(y0 - marginPx)),
    x1: Math.min(data.image.w, Math.ceil(x1 + marginPx)), y1: Math.min(data.image.h, Math.ceil(y1 + marginPx)),
  };
}

export const pxToWorld = (px, py, W, H) => [(px - W / 2) * K, (py - H / 2) * K];

export function pointInPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Smallest camera distance at which a (2*halfW x 2*halfD) ground rect, rotated by yaw and foreshortened by pitch, fits with 8% margin. */
export function fitDistance({ halfW, halfD, yaw, pitch, fov, aspect, padY = 0 }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let ex = 0, ez = 0;
  for (const [x, z] of [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]]) {
    ex = Math.max(ex, Math.abs(x * c - z * s));
    ez = Math.max(ez, Math.abs(x * s + z * c));
  }
  const t = Math.tan(fov * Math.PI / 360), ey = ez * Math.sin(pitch) / (1 - padY);   // padY: share of the view height covered by the header
  return Math.max(ex * 1.08 / (t * aspect), ey * 1.08 / t);
}

/** Default camera view: a 45 degree diamond seen from 35 degrees up on every screen, so a phone shows the same 3D look as a computer. */
export function defaultView(aspect) {
  return { yaw: DEFAULT_VIEW.yaw, pitch: 35 * Math.PI / 180 };
}

/** How much closer than "the whole tile fits" the home view starts: a portrait phone is width-limited, so the diamond's two empty side corners are cropped a little to make the campus bigger. */
export const homeScale = aspect => (aspect < 0.8 ? 0.92 : 1);

/** Like fitDistance but accounts for perspective (near corners look bigger): refines the closed form until the corners just fit. */
export function fitDistancePerspective(o) {
  const { halfW, halfD, yaw, pitch, fov, aspect, padY = 0 } = o, th = Math.tan(fov * Math.PI / 360);
  const limX = 1 / 1.08, limY = (1 - padY) / 1.08, sy = Math.sin(yaw), cy = Math.cos(yaw);
  let d = fitDistance(o);
  for (let i = 0; i < 12; i++) {
    let mx = 0, my = 0;
    for (const [x, z] of [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]]) {
      const t = x * sy + z * cy, rx = x * cy - z * sy, depth = d - t * Math.cos(pitch);
      mx = Math.max(mx, Math.abs(rx / (th * aspect * depth))); my = Math.max(my, Math.abs(t * Math.sin(pitch) / (th * depth)));
    }
    const s = Math.max(mx / limX, my / limY);
    if (Math.abs(s - 1) < 1e-4) break;
    d *= s;
  }
  return d;
}
