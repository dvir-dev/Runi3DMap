import * as THREE from "../vendor/three.module.min.js";
import { createScene } from "./scene.js";
import { createControls } from "./controls.js";
import { createUI } from "./ui.js";
import { createGyro } from "./gyro.js";
import { defaultView } from "./geo.js";
import { createFrameGate } from "./framegate.js";
import { createRenderLoop } from "./renderloop.js";
import { shouldShowIosHint, registerPwa } from "./pwa.js";
import { createNav } from "./nav.js";
import { loadGrid } from "./gridload.js";
import { createRoute, routeStats } from "./route.js";
import { codedEntries } from "./rooms.js";
import { pickVisible } from "./declutter.js";

const $ = id => document.getElementById(id);
const data = await (await fetch("data/campus.json")).json();

// on-screen size of one metre of ground at the view centre (lets far-away students be drawn bigger)
const pxPerMeter = () => (api.size.y / 2) / (Math.tan(api.camera.fov * Math.PI / 360) * controls.st.dist);

// ---- render scheduling: redraw when something changed; keep a capped loop only while students are animating
const coarse = matchMedia("(pointer:coarse)").matches, reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const gate = createFrameGate(coarse ? 30 : 60);       // phones: 30 fps for the walking animation, to save battery
let dirty = true, last = 0, lastAnim = 0, api, controls, ui, studentsOn = true;
const studentsAnimating = () => !!api.students && studentsOn && !reduceMotion.matches && !document.hidden;
// the flags wave only while the plaza is on screen and close enough to see (an always-on loop would waste battery)
function flagsVisible() {
  if (!api.flags || reduceMotion.matches || document.hidden || controls.st.dist > 750) return false;
  return api.flags.samples.some(p => { const s = api.project(p); return s.z > -1 && s.z < 1 && s.x > -80 && s.x < api.size.x + 80 && s.y > -80 && s.y < api.size.y + 80; });
}
const animating = () => studentsAnimating() || flagsVisible();
const loop = createRenderLoop({
  raf: requestAnimationFrame.bind(window), isHidden: () => document.hidden, ready: () => !!(api && controls),
  onStop: () => { last = lastAnim = 0; },
  frame(now) {
    const dt = Math.min(64, now - (last || now)); last = now;
    const moving = controls.update(now, dt);
    let tick = false;
    if (animating() && gate.ready(now)) {
      if (studentsAnimating()) api.students.update((now - (lastAnim || now)) / 1000, pxPerMeter());
      if (api.flags && flagsVisible()) api.flags.update(now / 1000);
      lastAnim = now; tick = true;
    }
    if (dirty || moving || tick) { dirty = false; api.renderer.render(api.scene, api.camera); updatePins(); updateCompass(); }
    return dirty || moving || animating();
  },
});
function invalidate() { dirty = true; loop.invalidate(); }
document.addEventListener("visibilitychange", () => { if (!document.hidden) invalidate(); });

api = await createScene($("gl"), data, { onDirty: invalidate });   // quality (pixel ratio, shadows, ground size, student count) comes from device.js
controls = createControls({ canvas: $("gl"), api, onChange: invalidate, onTap: handleTap, chromeTop: () => $("bar").getBoundingClientRect().bottom, reducedMotion: () => reduceMotion.matches });

// ---- pins (HTML badges projected from the roof of each building)
const pinLayer = $("pins"), pinEls = new Map();
let codeOf = new Map(), codesOnly = false;                                         // codesOnly: show only the pins of lettered buildings (C, A, L...), labelled with their letter
const pinShown = n => !codesOnly || codeOf.has(n) || n === selectedN;
for (const p of api.pins) { const el = document.createElement("div"); el.className = "pin"; el.innerHTML = `<i>${p.n}</i>`; pinLayer.appendChild(el); pinEls.set(p.n, el); }
let clutterHidden = new Set();                                                       // pins thinned out because they would sit on top of a more important one (not tappable while hidden)
function updatePins() {
  const w = api.size.x, h = api.size.y;
  // badges shrink when zoomed out so the 51 pins stay legible instead of piling up
  const zoom = controls.fitDist() / controls.st.dist, ps = Math.min(1.12, Math.max(0.5, 0.32 + 0.42 * zoom)), small = Math.min(w, h) < 520 ? 0.9 : 1, scale = ps * small;
  const onScreen = [];
  for (const p of api.pins) {
    const s = api.project(p.pos);
    if (pinShown(p.n) && s.z > -1 && s.z < 1 && s.x > -30 && s.x < w + 30 && s.y > -10 && s.y < h + 60) onScreen.push({ p, s, n: p.n, x: s.x, y: s.y, rank: p.n === selectedN ? 0 : codeOf.has(p.n) ? 1 : 2 });
  }
  const keep = pickVisible(onScreen, 29 * scale);                                      // zoomed out, overlapping badges thin out: selected first, then lettered buildings, then by number
  clutterHidden = new Set(onScreen.filter(o => !keep.has(o.n)).map(o => o.n));
  const place = new Map(onScreen.map(o => [o.n, o.s]));
  for (const p of api.pins) {
    const el = pinEls.get(p.n), s = place.get(p.n), vis = !!s && keep.has(p.n);
    const label = codesOnly && codeOf.has(p.n) ? codeOf.get(p.n) : String(p.n);
    if (el.dataset.label !== label) { el.dataset.label = label; el.firstChild.textContent = label; el.classList.toggle("code", label.length > 1 || isNaN(+label)); }
    el.style.display = vis ? "block" : "none"; if (!vis) continue;
    el.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
    el.style.zIndex = el.classList.contains("sel") ? 9999 : Math.round(s.y);
  }
}
function updateCompass() { const tt = $("tilt-txt"), want = controls.st.pitch > 1.2 ? "3D" : "2D"; if (tt.textContent !== want) tt.textContent = want; $("compass").style.transform = `rotate(${(-controls.st.yaw * 180 / Math.PI).toFixed(1)}deg)`; }

// ---- walking directions: the route is drawn on the ground; the walk grid and the door points load the first time someone asks
const route = createRoute(THREE, data.image.w, data.image.h); api.scene.add(route.group);
let navP = null, routeTo = null, routeFrom = 40;
try { const saved = +localStorage.getItem("routeFrom"); if (saved) routeFrom = saved; } catch {}
const getNav = () => navP ??= Promise.all([fetch("data/tile.json").then(r => r.json()), fetch("data/pois.json").then(r => r.json())]).then(async ([tile, pois]) => ({ nav: createNav(await loadGrid(tile)), pois: new Map(pois.map(p => [p.n, [p.x, p.y]])) }));
function clearRoute() { if (routeTo == null) return; routeTo = null; route.clear(); ui.hideRoute(); invalidate(); }
async function showRoute(toN, fromN = routeFrom) {
  if (!entryBy.has(toN)) return;
  if (fromN === toN) fromN = toN === 40 ? 17 : 40;                                         // asking for directions to the start itself: start from the other main entrance
  routeTo = toN; routeFrom = fromN; try { localStorage.setItem("routeFrom", String(fromN)); } catch {}
  ui.showRoute({ from: fromN, to: toN, state: "busy" });
  try {
    const { nav, pois } = await getNav(); if (routeTo !== toN) return;
    const path = fromN === toN ? null : nav.findPath(pois.get(fromN), pois.get(toN));
    if (!path) { route.clear(); ui.showRoute({ from: fromN, to: toN, state: "none" }); invalidate(); return; }
    const b = route.set(path); ui.showRoute({ from: fromN, to: toN, state: "ok", stats: routeStats(path) });
    const o = ui.obstruction(), diag = Math.max(Math.hypot(b.x1 - b.x0, b.z1 - b.z0), 60), vf = api.camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * api.camera.aspect), half = Math.min(hf, vf * 0.6) / 2;   // the whole route in view: its diagonal against the narrower of the horizontal and (what the sheet leaves of the) vertical field of view
    controls.flyTo({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, dist: Math.min(controls.LIM.maxDist, (diag / 2 * 1.3) / Math.tan(half)), pitch: Math.max(controls.st.pitch, 0.7), inset: { x: o.x, y: o.y } }, 900); invalidate();
  } catch (e) { console.warn("directions failed: " + e.message); if (routeTo === toN) { route.clear(); ui.showRoute({ from: fromN, to: toN, state: "none" }); invalidate(); } }
}

// ---- selection
let selectedN = null;
const entryBy = new Map(data.entries.map(e => [e.n, e]));
function pinPos(n) { return api.pins.find(p => p.n === n)?.pos; }
function focusFor(group, e) {
  const b = e.building != null ? api.byId.get(e.building) : null;
  if (b) { let x = 0, z = 0; for (const [px, py] of b.poly) { x += px; z += py; } x /= b.poly.length; z /= b.poly.length; const xs = b.poly.map(p => p[0]), ys = b.poly.map(p => p[1]); const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 6;
    return { x: api.wx(x), z: api.wz(z), dist: controls.distForSpan(Math.max(span * 1.5, 75)) }; }
  const p = pinPos(e.n); return { x: p.x, z: p.z, dist: 90 };
}
function selectEntry(n, { fly = true } = {}) {
  const e = entryBy.get(n); if (!e) return;
  if (routeTo != null && routeTo !== n) clearRoute();
  selectedN = n;
  const group = e.building != null ? data.entries.filter(x => x.building === e.building || x.extra?.includes(e.building)) : [e];
  api.setSelected(e.building, e.extra || []);
  for (const [k, el] of pinEls) el.classList.toggle("sel", k === n);
  ui.showSheet(group, n); updatePins();
  if (fly) { const f = focusFor(group, e); const o = ui.obstruction(); controls.flyTo({ x: f.x, z: f.z, dist: Math.min(controls.st.dist, f.dist) === controls.st.dist && controls.st.dist < f.dist * 1.15 ? controls.st.dist : f.dist, pitch: Math.max(controls.st.pitch, 0.7), inset: { x: o.x, y: o.y } }, 850); }
  else controls.setInset(...Object.values(ui.obstruction()));
  invalidate();
}
function clearSelection() {
  clearRoute(); selectedN = null; api.setSelected(null); for (const el of pinEls.values()) el.classList.remove("sel");
  ui.hideSheet(); controls.setInset(0, 0); invalidate();
}
function handleTap(x, y) {
  hintGone();
  // pins first (bigger touch targets than the small buildings), then building meshes
  let best = null, bd = 30;
  for (const p of api.pins) { if (!pinShown(p.n) || clutterHidden.has(p.n)) continue; const s = api.project(p.pos); const d = Math.hypot(s.x - x, (s.y - 16) - y); if (d < bd && s.z < 1) { bd = d; best = p.n; } }
  if (best != null) return selectEntry(best);
  const id = api.pickBuilding(x, y);
  if (id != null) { const owner = data.entries.find(e => e.building === id || e.extra?.includes(id)); if (owner) return selectEntry(owner.n); }
  if (ui.indexOpen()) return ui.closeIndex();
  if (selectedN != null) clearSelection();
}

const categories = await fetch("data/categories.json").then(r => r.json()).catch(() => null);   // optional: without it the chip row just hides
const codes = await fetch("data/building-codes.json").then(r => r.json()).catch(() => ({}));   // optional: without it room search is just off
codeOf = codedEntries(codes);
{ const btn = $("btn-codes"); let saved = null; try { saved = localStorage.getItem("codesOnly"); } catch {}
  codesOnly = saved === "1" && codeOf.size > 0; btn.hidden = codeOf.size === 0;
  const apply = () => { btn.classList.toggle("on", codesOnly); btn.setAttribute("aria-pressed", String(codesOnly)); invalidate(); };
  btn.onclick = () => { codesOnly = !codesOnly; try { localStorage.setItem("codesOnly", codesOnly ? "1" : "0"); } catch {} apply(); }; apply(); }
ui = createUI({ data, categories, codes, onSelectEntry: selectEntry, onCloseSheet: clearSelection, onLayout: () => {}, onDirections: n => showRoute(n), onRouteFrom: n => showRoute(routeTo, n), onRouteClear: clearRoute });
ui.applyLang();

// ---- phone web-app polish: install hint (iOS Safari), offline service worker, WebGL context loss (iOS drops it when backgrounded)
{
  const el = $("ios-hint"); let dismissed = false; try { dismissed = localStorage.getItem("iosHint") === "1"; } catch {}
  const standalone = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  if (shouldShowIosHint({ ua: navigator.userAgent, standalone, dismissed })) { el.hidden = false; $("ios-hint-close").onclick = () => { el.hidden = true; try { localStorage.setItem("iosHint", "1"); } catch {} }; }
  $("gl").addEventListener("webglcontextlost", e => e.preventDefault());
  $("gl").addEventListener("webglcontextrestored", () => { api.bakeShadows(); invalidate(); });
  registerPwa();
}

// ---- resize / rotation
function resize() {
  const layout = ui.layout(); const w = innerWidth, h = innerHeight;
  api.resize(w, h); controls.onResize();
  if (ui.sheetOpen()) controls.setInset(...Object.values(ui.obstruction()), 200);
  invalidate();
}
new ResizeObserver(resize).observe(document.documentElement);
addEventListener("orientationchange", () => setTimeout(resize, 120));
resize(); controls.init();

// ---- toolbar
$("btn-zin").onclick = () => { hintGone(); controls.zoomBy(0.62); };
$("btn-zout").onclick = () => { hintGone(); controls.zoomBy(1.6); };
$("btn-rot-l").onclick = () => controls.rotateBy(-Math.PI / 6);
$("btn-rot-r").onclick = () => controls.rotateBy(Math.PI / 6);
$("btn-north").onclick = () => controls.resetNorth();
$("btn-home").onclick = () => { if (selectedN != null) clearSelection(); controls.home(); };
const tiltLabel = () => { $("tilt-txt").textContent = controls.st.pitch > 1.2 ? "3D" : "2D"; };   // label = what a tap switches to
$("btn-tilt").onclick = () => { controls.setTilt(controls.st.pitch > 1.2 ? defaultView(api.camera.aspect).pitch : 1.45); };
let hintTimer = setTimeout(hintGone, 9000); function hintGone() { clearTimeout(hintTimer); $("hint").classList.add("gone"); }

// ---- students toggle (persisted; hidden when unavailable or when the user prefers reduced motion)
{
  const btn = $("btn-students"); let saved = null; try { saved = localStorage.getItem("students"); } catch {}
  studentsOn = saved !== "0";
  const apply = () => { const avail = !!api.students && !reduceMotion.matches; btn.hidden = !avail; btn.classList.toggle("on", studentsOn && avail); if (api.students) api.students.setVisible(studentsOn && avail); invalidate(); };
  btn.onclick = () => { studentsOn = !studentsOn; try { localStorage.setItem("students", studentsOn ? "1" : "0"); } catch {} apply(); };
  reduceMotion.addEventListener?.("change", apply); apply();
}

// ---- gyroscope (opt-in; needs a user gesture on iOS)
const gyro = createGyro({ controls, onState: (on, why) => { $("btn-gyro").classList.toggle("on", on); if (why === "none") ui.toast(ui.t().gyroNone); } });
if (gyro.supported && matchMedia("(pointer:coarse)").matches) $("btn-gyro").hidden = false;
$("btn-gyro").onclick = async () => { hintGone(); if (gyro.on) return gyro.disable(); try { await gyro.enable(); } catch (e) { ui.toast(e.message === "denied" ? ui.t().gyroDenied : ui.t().gyroNone); } };
$("gl").addEventListener("pointerdown", () => gyro.pause()); addEventListener("pointerup", () => gyro.resume());

// ---- keyboard (desktop)
addEventListener("keydown", e => { if (e.target.tagName === "INPUT") { if (e.key === "Escape") ui.closeIndex(); return; }
  if (e.key === "Escape") { ui.indexOpen() ? ui.closeIndex() : clearSelection(); }
  else if (e.key === "+" || e.key === "=") controls.zoomBy(0.7); else if (e.key === "-") controls.zoomBy(1.4);
  else if (e.key === "ArrowLeft") controls.flyTo({ yaw: controls.st.yaw - 0.4 }, 300); else if (e.key === "ArrowRight") controls.flyTo({ yaw: controls.st.yaw + 0.4 }, 300); });

api.bakeShadows(); invalidate();
$("loader").classList.add("done");
window.__campus = { profile: api.profile, api, controls, ui, selectEntry, clearSelection, showRoute, clearRoute, gyro, data };   // handy for debugging in the console
