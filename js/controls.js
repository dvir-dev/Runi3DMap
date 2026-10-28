// Map-style camera controls (pointer events): drag = pan, pinch = zoom, twist = rotate, two-finger drag = tilt.
import * as THREE from "../vendor/three.module.min.js";
import { fitDistancePerspective as fitDistance, defaultView, homeScale } from "./geo.js";

const LIM = { minDist: 28, maxDist: 9000, minPitch: 20 * Math.PI / 180, maxPitch: 85 * Math.PI / 180 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

export function createControls({ canvas, api, onChange, onTap, chromeTop = () => 0, reducedMotion = () => false }) {
  const { camera, groundPoint, bounds, tile } = api;
  const st = { x: tile.cx, z: tile.cz, yaw: Math.PI / 4, pitch: 35 * Math.PI / 180, dist: 600 };
  const inset = { x: 0, y: 0, tx: 0, ty: 0 };                 // view-offset (px) so the focus stays clear of the info sheet
  let anim = null, vel = { x: 0, z: 0 }, lastDist = 0;

  // distance at which the whole tile fits in the default (diamond) view for the current screen shape
  const fitDist = () => clamp(fitDistance({ halfW: tile.halfW, halfD: tile.halfD, ...defaultView(camera.aspect), fov: camera.fov, aspect: camera.aspect, padY: Math.min(0.4, chromeTop() / Math.max(1, api.size.y)) }), LIM.minDist, LIM.maxDist);

  // camera distance at which something `span` metres wide fills the view with a little margin (aware of portrait/landscape)
  const distForSpan = span => { const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect); return clamp(Math.max(span * 0.85 / Math.tan(hf / 2), span * 0.62 / Math.tan(vf / 2)), 70, 700); };

  // a NaN anywhere in the camera state (a zero-sized screen at start-up, a bad fly-to) would stick for ever and leave a blank map: put back sane values instead
  function sane() {
    const d = defaultView(camera.aspect);
    if (!Number.isFinite(st.dist)) st.dist = Number.isFinite(lastDist) && lastDist > 0 ? lastDist : 1900;
    if (!Number.isFinite(st.pitch)) st.pitch = d.pitch; if (!Number.isFinite(st.yaw)) st.yaw = d.yaw;
    if (!Number.isFinite(st.x)) st.x = tile.cx; if (!Number.isFinite(st.z)) st.z = tile.cz;
  }

  function apply() {
    sane();
    st.pitch = clamp(st.pitch, LIM.minPitch, LIM.maxPitch); st.dist = clamp(st.dist, LIM.minDist, lastDist ? Math.min(LIM.maxDist, lastDist * 1.3) : LIM.maxDist);
    st.x = clamp(st.x, bounds.minX, bounds.maxX); st.z = clamp(st.z, bounds.minZ, bounds.maxZ);   // the view centre stays on the tile
    const cp = Math.cos(st.pitch);
    camera.position.set(st.x + st.dist * Math.sin(st.yaw) * cp, st.dist * Math.sin(st.pitch), st.z + st.dist * Math.cos(st.yaw) * cp);
    camera.lookAt(st.x, 0, st.z);
    camera.near = clamp(st.dist * 0.1, 2, 600); camera.far = st.dist * 1.6 + 1800;   // keep depth precision at long range
    const w = api.size.x, h = api.size.y;
    const oy = inset.y - chromeTop() / 2;   // the header covers the top of the screen: centre the scene in what is left
    if (Math.abs(inset.x) > 0.5 || Math.abs(oy) > 0.5) camera.setViewOffset(w, h, inset.x, oy, w, h); else camera.clearViewOffset();
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    onChange();
  }

  // keep the ground point under a screen position fixed while camera params change
  function anchored(sx, sy, mutate) { const g0 = groundPoint(sx, sy); mutate(); apply(); const g1 = g0 && groundPoint(sx, sy); if (g0 && g1) { st.x += g0.x - g1.x; st.z += g0.z - g1.z; apply(); } }

  // ---- pointers
  const ptrs = new Map(); let mode = null, g0 = null, tapInfo = null, lastTap = null, prevMid = null, prevD = 0, prevA = 0, lastMoveT = 0;
  const cancelAnim = () => { anim = null; vel.x = vel.z = 0; };
  const mid = () => { const p = [...ptrs.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), a: Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) }; };
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  canvas.addEventListener("pointerdown", e => {
    try { canvas.setPointerCapture(e.pointerId); } catch {} cancelAnim();
    ptrs.set(e.pointerId, { ...local(e), id: e.pointerId, btn: e.button });
    if (ptrs.size === 1) {
      const p = local(e); g0 = groundPoint(p.x, p.y);
      mode = e.pointerType === "mouse" && (e.button === 2 || e.ctrlKey || e.shiftKey) ? "orbit" : "pan";
      tapInfo = { x: p.x, y: p.y, t: performance.now(), moved: 0, multi: false };
    } else if (ptrs.size === 2) { mode = "pinch"; const m = mid(); prevMid = m; prevD = m.d; prevA = m.a; if (tapInfo) tapInfo.multi = true; }
  });
  canvas.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const n = local(e), dx = n.x - p.x, dy = n.y - p.y; p.x = n.x; p.y = n.y;
    if (tapInfo) tapInfo.moved += Math.hypot(dx, dy);
    if (mode === "pan" && ptrs.size === 1) {
      const g = groundPoint(n.x, n.y); if (g0 && g) { const ox = g0.x - g.x, oz = g0.z - g.z; st.x += ox; st.z += oz; const now = performance.now(), dt = Math.max(8, now - lastMoveT); vel.x = ox / dt * 0.6 + vel.x * 0.4; vel.z = oz / dt * 0.6 + vel.z * 0.4; lastMoveT = now; apply(); }
    } else if (mode === "orbit") { st.yaw -= dx * 0.008; apply(); }   // rotate left/right only: the tilt stays fixed
    else if (mode === "pinch" && ptrs.size >= 2) {
      const m = mid();
      anchored(m.x, m.y, () => { st.dist *= prevD / Math.max(m.d, 1); st.yaw += angDiff(m.a, prevA) - (m.x - prevMid.x) * 0.008; });   // twist or drag sideways to rotate
      prevMid = m; prevD = m.d; prevA = m.a;
    }
  });
  const end = e => {
    const had = ptrs.delete(e.pointerId); if (!had) return;
    if (ptrs.size === 0) {
      const ti = tapInfo, now = performance.now();
      if (ti && !ti.multi && ti.moved < 10 && now - ti.t < 450) {
        if (lastTap && now - lastTap.t < 320 && Math.hypot(lastTap.x - ti.x, lastTap.y - ti.y) < 34) { lastTap = null; zoomAt(ti.x, ti.y, 0.5); }
        else { lastTap = { x: ti.x, y: ti.y, t: now }; onTap(ti.x, ti.y); }
      } else if (mode === "pan" && now - lastMoveT < 80) { if (!reducedMotion()) { anim = { inertia: true }; onChange(); } }
      mode = null; tapInfo = null;
    } else if (ptrs.size === 1) { mode = "pan"; const p = [...ptrs.values()][0]; g0 = groundPoint(p.x, p.y); if (tapInfo) tapInfo.multi = true; }
  };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("wheel", e => {
    e.preventDefault(); cancelAnim(); const p = local(e), k = e.ctrlKey ? 0.01 : 0.0016;
    if (e.shiftKey && !e.ctrlKey) { st.yaw -= (e.deltaY || e.deltaX) * 0.004; apply(); return; }
    anchored(p.x, p.y, () => { st.dist *= Math.exp(clamp(e.deltaY, -120, 120) * k); });
  }, { passive: false });

  // ---- programmatic motion
  function flyTo(t, ms = 800) {
    if (reducedMotion()) ms = Math.min(ms, 200);   // prefers-reduced-motion: no long camera flights
    sane(); const from = { ...st }, to = { x: t.x ?? st.x, z: t.z ?? st.z, dist: t.dist ?? st.dist, pitch: t.pitch ?? st.pitch, yaw: t.yaw !== undefined ? from.yaw + angDiff(t.yaw, from.yaw) : st.yaw };
    const toIns = t.inset ? { x: t.inset.x, y: t.inset.y } : { x: inset.tx, y: inset.ty };
    const fromIns = { x: inset.x, y: inset.y };
    anim = { from, to, fromIns, toIns, t0: performance.now(), ms };
    onChange();   // wake the render loop
  }
  function setInset(x, y, ms = 350) { inset.tx = x; inset.ty = y; anim = anim && anim.to ? anim : null; const fromIns = { x: inset.x, y: inset.y }; insetAnim = { fromIns, to: { x, y }, t0: performance.now(), ms }; onChange(); }
  let insetAnim = null;
  function zoomAt(sx, sy, factor, ms = 260) {
    const g = groundPoint(sx, sy); if (!g) return;
    const d = clamp(st.dist * factor, LIM.minDist, LIM.maxDist), k = 1 - d / st.dist;
    flyTo({ x: st.x + (g.x - st.x) * k, z: st.z + (g.z - st.z) * k, dist: d }, ms);
  }
  const zoomBy = f => flyTo({ dist: clamp(st.dist * f, LIM.minDist, LIM.maxDist) }, 240);
  const rotateBy = a => flyTo({ yaw: st.yaw + a }, 350);
  const resetNorth = () => flyTo({ yaw: 0 }, 500);
  const home = (ms = 900) => flyTo({ x: tile.cx, z: tile.cz, ...defaultView(camera.aspect), dist: fitDist() * homeScale(camera.aspect) }, ms);
  const setTilt = p => flyTo({ pitch: p }, 450);

  function update(now, dt) {
    let active = false;
    if (anim && anim.to) {
      const k = clamp((now - anim.t0) / anim.ms, 0, 1), e = ease(k), f = anim.from, t = anim.to;
      st.x = f.x + (t.x - f.x) * e; st.z = f.z + (t.z - f.z) * e; st.yaw = f.yaw + (t.yaw - f.yaw) * e; st.pitch = f.pitch + (t.pitch - f.pitch) * e;
      st.dist = Math.exp(Math.log(f.dist) + (Math.log(t.dist) - Math.log(f.dist)) * e);
      inset.x = anim.fromIns.x + (anim.toIns.x - anim.fromIns.x) * e; inset.y = anim.fromIns.y + (anim.toIns.y - anim.fromIns.y) * e;
      if (k >= 1) anim = null; active = true;
    } else if (anim && anim.inertia) {
      const damp = Math.pow(0.0025, dt / 1000);
      st.x += vel.x * dt; st.z += vel.z * dt; vel.x *= damp; vel.z *= damp;
      if (Math.hypot(vel.x, vel.z) < 0.004) { anim = null; vel.x = vel.z = 0; } active = true;
    }
    if (insetAnim) {
      const k = clamp((now - insetAnim.t0) / insetAnim.ms, 0, 1), e = ease(k);
      inset.x = insetAnim.fromIns.x + (insetAnim.to.x - insetAnim.fromIns.x) * e; inset.y = insetAnim.fromIns.y + (insetAnim.to.y - insetAnim.fromIns.y) * e;
      if (k >= 1) insetAnim = null; active = true;
    }
    if (active) apply();
    return active;
  }

  // window resize / rotation: keep the same relative zoom
  // when the screen flips between portrait and wide, go to that shape's home view; otherwise keep the relative zoom
  let lastWide = null;
  function onResize() { const wide = camera.aspect >= 0.8; if (lastWide !== null && wide !== lastWide) { lastWide = wide; lastDist = fitDist(); home(450); return; } lastWide = wide; const f = fitDist(); const ratio = lastDist ? f / lastDist : 1; if (lastDist) st.dist = clamp(st.dist * ratio, LIM.minDist, LIM.maxDist); lastDist = f; apply(); }
  function init() { Object.assign(st, defaultView(camera.aspect)); { const f = fitDist(); lastDist = Number.isFinite(f) ? f : 0; } st.dist = (lastDist || 1900) * homeScale(camera.aspect); lastWide = camera.aspect >= 0.8; apply(); }

  return { st, update, flyTo, zoomAt, zoomBy, rotateBy, resetNorth, home, setTilt, setInset, onResize, init, apply, fitDist, LIM,
    distForSpan, setYawPitch(yaw, pitch) { st.yaw = yaw; st.pitch = pitch; apply(); } };
}
