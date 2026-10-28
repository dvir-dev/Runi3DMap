// Pure student state machine. Positions are in image px (1 m = 6 px); students are drawn STUDENT_SCALE x bigger, so they also walk that much faster.
export const STUDENT_SCALE = 3.4;                 // students are drawn this much bigger than life so they read next to the buildings and paths
export const LOOK_COUNTS = { shirt: 10, skin: 5, hair: 6 };
const PX_PER_M = 6, MIN_SPEED = 1.0 * STUDENT_SCALE * PX_PER_M, MAX_SPEED = 1.6 * STUDENT_SCALE * PX_PER_M;
const AHEAD = 1.2 * STUDENT_SCALE * PX_PER_M;     // someone closer than this in front of us makes us slow down

/** @param opts {leader?:Agent} a follower copies its leader's destination */
export function createAgent(id, rng, spawn, opts = {}) {
  const leader = opts.leader || null;
  const speed = leader ? Math.min(MAX_SPEED, Math.max(MIN_SPEED, leader.speed * (0.95 + rng() * 0.1))) : MIN_SPEED + rng() * (MAX_SPEED - MIN_SPEED);
  return {
    id, x: spawn[0], y: spawn[1], heading: rng() * Math.PI * 2, speed, state: "pause", path: [], seg: 0, timer: rng() * 2, phase: rng() * Math.PI * 2, dest: null, leader, idle: rng() * 10,
    look: { shirt: Math.floor(rng() * LOOK_COUNTS.shirt), skin: Math.floor(rng() * LOOK_COUNTS.skin), hair: Math.floor(rng() * LOOK_COUNTS.hair), pack: rng() < 0.4 },
  };
}

function startWalk(a, nav, poi) {
  const path = nav.findPath([a.x, a.y], [poi.x, poi.y]);
  if (!path || path.length < 2) return false;
  path[0] = [a.x, a.y]; a.path = path; a.seg = 1; a.dest = poi.n; a.state = "walk"; return true;
}

/** Advance one agent by dt seconds. ctx = {nav, pois:[{n,x,y}], rng, others:Agent[]} */
export function stepAgent(a, dt, ctx) {
  if (a.state === "pause") {
    a.idle += dt; a.timer -= dt; if (a.timer > 0) return;
    const { nav, pois, rng } = ctx;
    if (ctx.pathBudget && ctx.pathBudget.n <= 0) { a.timer = 0.05; return; }   // at most a few searches per frame: A* is the expensive part
    if (ctx.pathBudget) ctx.pathBudget.n--;
    if (a.leader) {                                                  // followers go where the leader goes
      const L = a.leader;
      if (L.dest == null || L.dest === a.dest) { a.timer = 0.4; return; }
      const poi = pois.find(p => p.n === L.dest);
      if (!poi || !startWalk(a, nav, poi)) a.timer = 0.4;
      return;
    }
    const options = pois.filter(p => p.n !== a.dest);
    if (!options.length) { a.timer = 1; return; }
    if (!startWalk(a, nav, options[Math.floor(rng() * options.length)])) a.timer = 0.3;   // no route: try another soon
    return;
  }
  // walking
  let remaining = a.speed * dt;
  let tx = a.path[a.seg][0], ty = a.path[a.seg][1], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d > 1e-6) { const ux = dx / d, uy = dy / d;
    for (const o of ctx.others) { if (o === a) continue; const ox = o.x - a.x, oy = o.y - a.y, od = Math.hypot(ox, oy); if (od < AHEAD && od > 1e-6 && (ox * ux + oy * uy) / od > 0.7) { remaining *= 0.5; break; } } }
  a.phase += remaining * 2 * Math.PI / (1.4 * STUDENT_SCALE * PX_PER_M);   // one full step cycle per 1.4 m (scaled) of walking
  while (remaining > 0) {
    tx = a.path[a.seg][0]; ty = a.path[a.seg][1]; dx = tx - a.x; dy = ty - a.y; d = Math.hypot(dx, dy);
    if (d > 1e-6) a.heading = Math.atan2(dy, dx);
    if (d <= remaining) { a.x = tx; a.y = ty; remaining -= d; a.seg++; if (a.seg >= a.path.length) { a.state = "pause"; a.timer = 2 + ctx.rng() * 4; return; } }
    else { a.x += dx / d * remaining; a.y += dy / d * remaining; remaining = 0; }
  }
}
