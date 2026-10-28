// Three.js scene: poster artwork as ground, extruded buildings in the poster's own colours, trees, pin projection.
import * as THREE from "../vendor/three.module.min.js";
import { K, pxToWorld, pointInPoly } from "./geo.js";
import { createTile, createBackground } from "./tile.js";
import { createBuildings } from "./buildings.js";
import { createTrees } from "./trees.js";
import { createHill } from "./hill.js";
import { createParking } from "./parking.js";
import { createSunken } from "./sunken.js";
import { createFlags } from "./flags.js";
import { createRunSign } from "./runsign.js";
import { createCourt } from "./court.js";
import { createStudents } from "./students.js";
import { createNav } from "./nav.js";
import { loadGrid } from "./gridload.js";
import { pickProfile } from "./device.js";
import { FEATURES } from "./features.js";

export { K };
export const PALETTE = { navy: 0x00378b, cream: 0xf6f3f0, lawn: 0xcade9f, lime: 0x87b314, pin: 0xeb690b, tree: 0x42827d, treeDark: 0x1e5f57 };

export async function createScene(canvas, data, { onDirty, studentCount }) {
  const W = data.image.w, H = data.image.h;
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const dpr = window.devicePixelRatio || 1;
  const profile = pickProfile({ coarse: matchMedia("(pointer:coarse)").matches, dpr, width: innerWidth, memory: navigator.deviceMemory, maxTexture: renderer.capabilities.maxTextureSize });
  console.info("quality profile", profile);
  renderer.setPixelRatio(Math.min(dpr, profile.dprCap));
  studentCount = FEATURES.students ? (studentCount ?? profile.students) : 0;   // archived: no students, nothing fetched
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;       // the scene is static: bake shadows once
  const scene = new THREE.Scene();
  scene.background = createBackground(THREE);
  const camera = new THREE.PerspectiveCamera(22, 1, 3, 6000);   // narrow FOV = near-isometric diorama look

  // ---- the tile (world rect from data/tile.json)
  const tileInfo = await (await fetch("data/tile.json")).json();
  const [minX, minZ] = pxToWorld(tileInfo.rect.x0, tileInfo.rect.y0, W, H), [maxX, maxZ] = pxToWorld(tileInfo.rect.x1, tileInfo.rect.y1, W, H);
  const rect = { minX, maxX, minZ, maxZ }, tcx = (minX + maxX) / 2, tcz = (minZ + maxZ) / 2, halfW = (maxX - minX) / 2, halfD = (maxZ - minZ) / 2;

  // ---- lights (flat, soft)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d7ea, 2.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(tcx - 260, 420, tcz - 180); sun.target.position.set(tcx, 0, tcz); scene.add(sun.target);   // from the north-west
  sun.castShadow = true;
  const hd = Math.hypot(halfW, halfD), sc = sun.shadow.camera; sc.left = -hd; sc.right = hd; sc.top = hd; sc.bottom = -hd; sc.near = 50; sc.far = 1400;
  sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4; sun.shadow.radius = 3;
  scene.add(sun);

  // ---- ground texture: pick a size, fall back to the other, then to a flat colour
  const loadImage = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("failed " + url)); i.src = url; });
  const order = profile.groundVariant === "half" ? [tileInfo.ground.half, tileInfo.ground.full] : [tileInfo.ground.full, tileInfo.ground.half];
  let groundSource = null;
  for (const url of order) { try { groundSource = await loadImage(url); break; } catch (e) { console.warn(e.message); } }
  if (!groundSource) { console.warn("ground texture unavailable, using a flat colour"); groundSource = document.createElement("canvas"); groundSource.width = groundSource.height = 4; const gx = groundSource.getContext("2d"); gx.fillStyle = "#E9E5DE"; gx.fillRect(0, 0, 4, 4); }
  const groundTex = new THREE.Texture(groundSource); groundTex.needsUpdate = true;
  groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); groundTex.generateMipmaps = true; groundTex.minFilter = THREE.LinearMipmapLinearFilter;
  let sunkenCfg = null; try { sunkenCfg = await (await fetch("data/sunken.json")).json(); } catch { /* optional */ }
  const sunken = sunkenCfg ? createSunken(THREE, sunkenCfg, W, H, rect, groundTex) : null;
  const tileGroup = createTile(THREE, { rect, groundTexture: groundTex, hole: sunken && sunken.userData.hole }); scene.add(tileGroup);
  if (sunken) scene.add(sunken);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfD * 2), new THREE.ShadowMaterial({ color: 0x2a2f6a, opacity: 0.24 }));
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.set(tcx, 0.08, tcz); shadowPlane.receiveShadow = true; scene.add(shadowPlane);

  // ---- buildings
  const buildings = createBuildings(THREE, data, W, H); scene.add(buildings.group);
  const byId = buildings.byId, pickables = buildings.pickables;

  // ---- trees
  let hill = null; try { hill = await (await fetch("data/hill.json")).json(); } catch { /* optional */ }
  if (hill) scene.add(createHill(THREE, hill, W, H));
  let flags = null; try { flags = createFlags(THREE, await (await fetch("data/flags.json")).json(), W, H); scene.add(flags); } catch (e) { console.warn("flag plaza skipped: " + e.message); }   // optional
  scene.add(createTrees(THREE, data, W, H, rect, hill, [sunken && sunken.userData.holePx, flags && flags.userData.zonePx].filter(Boolean)));
  try { scene.add(createCourt(THREE, await (await fetch("data/court.json")).json(), W, H)); } catch (e) { console.warn("basketball court skipped: " + e.message); }   // optional
  try { scene.add(createRunSign(THREE, await (await fetch("data/runsign.json")).json(), W, H)); } catch (e) { console.warn("I love RUN sign skipped: " + e.message); }   // optional
  try { scene.add(createParking(THREE, await (await fetch("data/parking.json")).json(), W, H)); } catch (e) { console.warn("parking lot skipped: " + e.message); }   // optional

  // ---- students (optional: if the walk grid or POIs fail to load the map still works)
  let students = null;
  if (studentCount > 0) {
    try {
      const [pois, grid] = await Promise.all([fetch("data/pois.json").then(r => { if (!r.ok) throw new Error("pois " + r.status); return r.json(); }), loadGrid(tileInfo)]);
      students = createStudents(THREE, { nav: createNav(grid), pois, count: studentCount, W, H, rect, capacity: Math.max(studentCount, 120) });
      scene.add(students.group);                                  // not part of pickables: taps go through students to the building
    } catch (e) { console.warn("students disabled: " + e.message); }
  }

  // ---- selection: a building and its raised roof parts light up together
  function setSelected(id, extra = []) { buildings.setHighlight(id != null ? [id, ...extra].flatMap(i => buildings.family(i)) : []); onDirty(); }   // extra: the other buildings of the same entry (e.g. the three dorm towers)

  // ---- pins: world position sits on the roof of the building the entry belongs to
  const buildingAt = (px, py) => data.buildings.filter(b => pointInPoly([px, py], b.poly)).sort((a, b) => b.height - a.height)[0];
  const pins = data.entries.filter(e => e.anchor).map(e => {
    const bh = e.building != null ? buildings.topY(e.building) : (buildingAt(...e.anchor) ? buildings.topY(buildingAt(...e.anchor).id) : 0);
    return { n: e.n, building: e.building, pos: new THREE.Vector3(wx(e.anchor[0]), (bh || 0) + 1.2, wz(e.anchor[1])) };
  });

  // ---- helpers
  const size = new THREE.Vector2(1, 1);
  function resize(w, h) { size.set(w, h); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); onDirty(); }
  const v = new THREE.Vector3();
  function project(pos) { v.copy(pos).project(camera); return { x: (v.x * 0.5 + 0.5) * size.x, y: (-v.y * 0.5 + 0.5) * size.y, z: v.z }; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setNdc(cx, cy) { ndc.set(cx / size.x * 2 - 1, -(cy / size.y) * 2 + 1); ray.setFromCamera(ndc, camera); }
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundPoint(cx, cy, out = new THREE.Vector3()) { setNdc(cx, cy); return ray.ray.intersectPlane(groundPlane, out) ? out : null; }
  function pickBuilding(cx, cy) { setNdc(cx, cy); const hit = ray.intersectObjects(pickables, false)[0]; return hit ? hit.object.userData.id : null; }
  const tile = { cx: tcx, cz: tcz, halfW, halfD, rect };

  let raf = 0;
  return { profile, flags: flags && { update: flags.userData.update, samples: flags.userData.samples }, students, renderer, camera, scene, size, resize, project, groundPoint, pickBuilding, setSelected, pins, byId, bounds: rect, tile, wx, wz,
    render() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderer.render(scene, camera); }); },
    bakeShadows() { renderer.shadowMap.needsUpdate = true; } };
}
