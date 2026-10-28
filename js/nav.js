// Pure navigation on a coarse class grid: components, A* (8-neighbour, no corner cutting), path smoothing, LRU cache.
export const BLOCKED = 0, LAWN = 1, PAVE = 2;
const COST = [Infinity, 3, 1], SQRT2 = Math.SQRT2;

/** Grey value of the walkgrid PNG -> class (nearest of 0 / 120 / 240). */
export const valueToClass = v => (v < 60 ? BLOCKED : v < 180 ? LAWN : PAVE);

export function createGrid({ cell, x0, y0, w, h, cls }) {
  return {
    cell, x0, y0, w, h, cls,
    at: (cx, cy) => (cx < 0 || cy < 0 || cx >= w || cy >= h ? BLOCKED : cls[cy * w + cx]),
    toCell: (px, py) => [Math.floor((px - x0) / cell), Math.floor((py - y0) / cell)],
    toPx: (cx, cy) => [x0 + (cx + 0.5) * cell, y0 + (cy + 0.5) * cell],
  };
}

/** walkLawn=false (default): students keep to paving (sidewalks and plazas); lawns are obstacles. */
export function createNav(grid, { cacheSize = 2600, walkLawn = false } = {}) {
  const { w, h, cls } = grid, N = w * h, at = grid.at;
  const passable = c => c === PAVE || (walkLawn && c === LAWN), free = (cx, cy) => passable(at(cx, cy));
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const canStep = (cx, cy, dx, dy) => free(cx + dx, cy + dy) && (dx === 0 || dy === 0 || (free(cx + dx, cy) && free(cx, cy + dy)));

  // connected components (same adjacency rule as the search)
  const comp = new Int32Array(N).fill(-1), sizes = [], queue = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!passable(cls[s]) || comp[s] >= 0) continue;
    const id = sizes.length; let head = 0, tail = 0, n = 0; queue[tail++] = s; comp[s] = id;
    while (head < tail) {
      const i = queue[head++], cx = i % w, cy = (i / w) | 0; n++;
      for (const [dx, dy] of DIRS) if (canStep(cx, cy, dx, dy)) { const j = (cy + dy) * w + cx + dx; if (comp[j] < 0) { comp[j] = id; queue[tail++] = j; } }
    }
    sizes.push(n);
  }
  const mainComponent = sizes.length ? sizes.indexOf(Math.max(...sizes)) : -1;
  const component = p => { const [cx, cy] = grid.toCell(p[0], p[1]); return cx < 0 || cy < 0 || cx >= w || cy >= h ? -1 : comp[cy * w + cx]; };

  // A* with reusable typed arrays (stamped, so no per-query allocation)
  const g = new Float32Array(N), parent = new Int32Array(N), stamp = new Int32Array(N), closed = new Int32Array(N); let cur = 0;
  let heap = [], hf = [];                           // parallel arrays: node ids and f-scores
  const push = (n, f) => { let i = heap.length; heap.push(n); hf.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; heap[i] = heap[p]; hf[i] = hf[p]; i = p; } heap[i] = n; hf[i] = f; };
  const pop = () => {
    const top = heap[0], n = heap.pop(), f = hf.pop();
    if (heap.length) { let i = 0; const L = heap.length; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; heap[i] = heap[c]; hf[i] = hf[c]; i = c; } heap[i] = n; hf[i] = f; }
    return top;
  };
  const octile = (ax, ay, bx, by) => { const dx = Math.abs(ax - bx), dy = Math.abs(ay - by); return (dx + dy) + (SQRT2 - 2) * Math.min(dx, dy); };

  function astar(sx, sy, tx, ty) {
    cur++; heap = []; hf = []; const s = sy * w + sx, t = ty * w + tx;
    g[s] = 0; stamp[s] = cur; parent[s] = -1; push(s, octile(sx, sy, tx, ty));
    while (heap.length) {
      const i = pop(); if (closed[i] === cur) continue; closed[i] = cur;
      if (i === t) break;
      const cx = i % w, cy = (i / w) | 0;
      for (const [dx, dy] of DIRS) {
        if (!canStep(cx, cy, dx, dy)) continue;
        const nx = cx + dx, ny = cy + dy, j = ny * w + nx, ng = g[i] + (dx && dy ? SQRT2 : 1) * COST[cls[j]];
        if (stamp[j] !== cur || ng < g[j]) { stamp[j] = cur; g[j] = ng; parent[j] = i; push(j, ng + octile(nx, ny, tx, ty)); }
      }
    }
    if (closed[t] !== cur) return null;
    const out = []; for (let i = t; i !== -1; i = parent[i]) out.push([i % w, (i / w) | 0]);
    return out.reverse();
  }

  // string pulling: skip waypoints when the straight line is walkable AND not costlier than the route it replaces
  function lineCost(a, b) {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(dist * 2)); let prev = a, cost = 0;
    for (let k = 1; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, cx = Math.round(x), cy = Math.round(y);
      if (!free(cx, cy)) return Infinity;
      if (cx !== prev[0] && cy !== prev[1] && !(free(cx, prev[1]) && free(prev[0], cy))) return Infinity;
      cost += COST[cls[cy * w + cx]] * dist / n; prev = [cx, cy];
    }
    return cost;
  }
  function smooth(path) {
    const stepCost = (a, b) => (a[0] !== b[0] && a[1] !== b[1] ? SQRT2 : 1) * COST[cls[b[1] * w + b[0]]];
    const acc = [0]; for (let i = 1; i < path.length; i++) acc.push(acc[i - 1] + stepCost(path[i - 1], path[i]));
    const out = [path[0]]; let i = 0;
    while (i < path.length - 1) {
      let best = i + 1;
      for (let j = path.length - 1; j > i + 1; j--) if (lineCost(path[i], path[j]) <= (acc[j] - acc[i]) * 1.02 + 1e-6) { best = j; break; }
      out.push(path[best]); i = best;
    }
    return out;
  }

  const cache = new Map();
  function findPath(a, b) {
    const [ax, ay] = grid.toCell(a[0], a[1]), [bx, by] = grid.toCell(b[0], b[1]);
    if (!free(ax, ay) || !free(bx, by) || comp[ay * w + ax] !== comp[by * w + bx]) return null;
    const key = (ay * w + ax) * N + (by * w + bx), hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit.map(p => p.slice()); }
    const raw = astar(ax, ay, bx, by); if (!raw) return null;
    const path = smooth(raw).map(([cx, cy]) => grid.toPx(cx, cy));
    cache.set(key, path); if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
    return path.map(p => p.slice());
  }

  function nearestWalkable(p, radiusCells, { mainOnly = false } = {}) {
    const [cx, cy] = grid.toCell(p[0], p[1]); let best = null, bd = Infinity;
    for (let r = 0; r <= radiusCells; r++) {
      if (best && r > bd + 1) break;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy; if (!free(x, y) || (mainOnly && comp[y * w + x] !== mainComponent)) continue;
        const d = Math.hypot(dx, dy); if (d < bd && d <= radiusCells) { bd = d; best = [x, y]; }
      }
    }
    return best ? grid.toPx(best[0], best[1]) : null;
  }
  return { findPath, nearestWalkable, component, mainComponent, cacheSize: () => cache.size };
}
