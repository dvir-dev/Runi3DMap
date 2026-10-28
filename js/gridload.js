// Browser-only: decode assets/walkgrid.png (one grey pixel per cell) into a nav grid.
import { createGrid, valueToClass } from "./nav.js";

export async function loadGrid(tile) {
  const { src, cell, x0, y0, w, h } = tile.walk;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("walk grid failed to load: " + src)); i.src = src; });
  if (img.width !== w || img.height !== h) throw new Error(`walk grid is ${img.width}x${img.height}, expected ${w}x${h}`);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, w, h).data, cls = new Uint8Array(w * h);
  for (let i = 0; i < cls.length; i++) cls[i] = valueToClass(px[i * 4]);
  return createGrid({ cell, x0, y0, w, h, cls });
}
