// Low-poly buildings: textured walls (one mesh) + roof / parapet / rooftop props / hip roof (one vertex-coloured mesh).
import { K, pointInPoly } from "./geo.js";
import { roofPlan } from "./roofplan.js";
import { createAdelson } from "./adelson.js";
import { createRadzyner } from "./radzyner.js";
import { createIvcher } from "./ivcher.js";
import { createJusidman } from "./jusidman.js";
import { createHangar } from "./hangar.js";
import { createDorm } from "./dorm.js";
import { createArabov } from "./arabov.js";
import { createAuditorium } from "./auditorium.js";
import { createElpern } from "./elpern.js";
import { innovationExtras, INNOVATION } from "./innovation.js";
import { createOfer } from "./ofer.js";

const FLOOR = 3.4, BAY = 6;
const STYLED = new Set(["stone", "wood", "woodglass", "whitecube", "glassfins", "whitebox", "glassbridge", "innovation", "lawschool", "curtain", "lockers"]);   // wall styles with their own texture
const FLOOR_BY_STYLE = { innovation: INNOVATION.floor, lawschool: 4.5, curtain: 4.5, lockers: 3.4 };                                                                    // styles drawn one floor per texture tile at their own floor height                      // metres per floor / per window bay (texture repeat)
const GLASS = "#3E5C9A", TERRACOTTA = "#C9694B", PROP = "#D9D6D0", LIME = "#87B314";

function stoneTexture(THREE) {                                         // pale limestone panels with a few small deep windows (the library and its neighbours)
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#E6DFCB"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#D2CAB2"; for (const [x, y, w] of [[0, 0, 60], [64, 0, 64], [20, 21, 80], [0, 42, 44], [48, 42, 80], [10, 64, 60], [76, 64, 52], [0, 86, 70], [74, 86, 54], [30, 107, 90]]) { g.fillRect(x, y, w, 2); g.fillRect(x + w - 1, y, 2, 21); }
  g.fillStyle = "#3F4A59"; g.fillRect(38, 44, 22, 34); g.fillStyle = "#6F7F94"; g.fillRect(38, 44, 22, 8); g.fillStyle = "#C9C0A5"; g.fillRect(36, 42, 26, 3);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function woodTexture(THREE) {                                          // single-storey bungalow: pale yellow horizontal cladding, brown posts, a window with a blue frame
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#E3D79F"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#C9BC82"; for (let y = 8; y < 128; y += 11) g.fillRect(0, y, 128, 2);
  g.fillStyle = "#5C6F8F"; g.fillRect(26, 30, 50, 52); g.fillStyle = "#2E3948"; g.fillRect(31, 35, 40, 42); g.fillStyle = "#8FA0B8"; g.fillRect(31, 35, 40, 10); g.fillStyle = "#5C6F8F"; g.fillRect(49, 35, 4, 42);
  g.fillStyle = "#9A6A4C"; g.fillRect(118, 0, 10, 128); g.fillStyle = "#6E4A36"; g.fillRect(0, 0, 128, 6);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function arazTexture(THREE, kind) {                                    // Arazi-Ofer: per floor, a terracotta wood-clad band over a glass band (communications wing), or white concrete with small windows (the computer-science cube)
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  if (kind === "woodglass") {
    g.fillStyle = "#B9683A"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#A15A31"; for (let y = 4; y < 70; y += 9) g.fillRect(0, y, 128, 1);
    g.fillStyle = "#3C536B"; g.fillRect(0, 74, 128, 50); g.fillStyle = "#7B95B0"; g.fillRect(0, 74, 128, 10); g.fillStyle = "#D8D2C4"; g.fillRect(0, 70, 128, 5); g.fillRect(0, 124, 128, 4);
    g.fillStyle = "#2A3340"; for (const x of [0, 42, 85]) g.fillRect(x, 75, 3, 49);
  } else {
    g.fillStyle = "#E4E0D4"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#2F3A48"; for (const x of [14, 78]) { g.fillRect(x, 40, 30, 38); g.fillStyle = "#6F8199"; g.fillRect(x, 40, 30, 9); g.fillStyle = "#2F3A48"; }
    g.fillStyle = "#CFCABB"; g.fillRect(0, 120, 128, 8);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function arisonTexture(THREE, kind) {                                  // Arison-Lauder: a glass curtain wall behind vertical white fins (the Lauder wing), or a plain white wall with tall narrow windows (the Arison block)
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  if (kind === "innovation") {                                            // Innovation Centre: one floor per tile (INNOVATION.floor): a pale slab, blue-grey vision glass over a darker spandrel, thin mullions, and a beige panel column (with a louvre) every other bay
    g.fillStyle = "#4A6E92"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#6F95B8"; g.fillRect(0, 10, 128, 66); g.fillStyle = "#5A7FA3"; g.fillRect(0, 76, 128, 40);
    g.fillStyle = "#A5B3BE"; g.fillRect(0, 0, 128, 7); g.fillRect(0, 74, 128, 3); g.fillRect(0, 116, 128, 12); g.fillStyle = "#2B4057"; for (const x of [0, 26, 52, 78]) g.fillRect(x, 7, 2, 109);
    g.fillStyle = "#D6CDBF"; g.fillRect(104, 0, 24, 128); g.fillStyle = "#BFB5A4"; g.fillRect(104, 0, 2, 128); g.fillStyle = "#6D645A"; g.fillRect(108, 80, 16, 14); g.fillStyle = "#D6CDBF"; for (let y = 82; y < 94; y += 4) g.fillRect(108, y, 16, 1);
  } else if (kind === "glassbridge") {                                           // a glazed link block: teal glass in bands, a pale slab at every floor, thin mullions
    g.fillStyle = "#4E8F9A"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#7FB7BF"; g.fillRect(0, 8, 128, 46); g.fillRect(0, 74, 128, 46);
    g.fillStyle = "#D9DDD6"; g.fillRect(0, 0, 128, 8); g.fillRect(0, 60, 128, 8); g.fillRect(0, 120, 128, 8);
    g.fillStyle = "#2E4A55"; for (const x of [0, 32, 64, 96]) g.fillRect(x, 8, 3, 112);
  } else if (kind === "glassfins") {
    g.fillStyle = "#A9C4CC"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#C6D9DD"; g.fillRect(0, 0, 128, 30); g.fillStyle = "#8AA9B4"; g.fillRect(0, 70, 128, 3);
    g.fillStyle = "#EEF1EF"; for (let x = 0; x < 128; x += 16) { g.fillRect(x, 0, 3, 128); g.fillStyle = "#7C98A3"; g.fillRect(x + 3, 0, 1, 128); g.fillStyle = "#EEF1EF"; }
    g.fillStyle = "#E3E6E2"; g.fillRect(0, 124, 128, 4);
  } else {
    g.fillStyle = "#EDEBE4"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#CFCDC4"; g.fillRect(0, 124, 128, 4);
    g.fillStyle = "#C7D1C0"; g.fillRect(54, 0, 14, 128); g.fillStyle = "#6A7F8C"; g.fillRect(56, 0, 10, 128); g.fillStyle = "#EDEBE4"; g.fillRect(54, 62, 14, 3);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function lawTexture(THREE, kind) {                                     // the merged Radzyner Law School / School of Sustainability: one floor per tile. "lawschool": a cream wall with a ribbon of small panes; "curtain": blue-tinted curtain glass in white mullions (the entrance atrium)
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  if (kind === "lockers") {                                              // public changing rooms: plain pale rendered walls, a row of small high ventilation windows under the roof, a plinth
    g.fillStyle = "#E4E0D2"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#C9C4B4"; g.fillRect(0, 118, 128, 10); g.fillRect(0, 0, 128, 5);
    g.fillStyle = "#4D6A86"; for (const x of [10, 42, 74, 106]) { g.fillRect(x, 16, 22, 10); g.fillStyle = "#8CA6BC"; g.fillRect(x, 16, 22, 3); g.fillStyle = "#4D6A86"; }
  } else if (kind === "curtain") {
    g.fillStyle = "#6F95BE"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#8FB4D6"; g.fillRect(0, 8, 128, 52); g.fillStyle = "#5F86B0"; g.fillRect(0, 76, 128, 40);
    g.fillStyle = "#EEF1F4"; g.fillRect(0, 0, 128, 7); g.fillRect(0, 62, 128, 3); g.fillRect(0, 120, 128, 8); for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 3, 128);
  } else {
    g.fillStyle = "#DCD3B8"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#CBC1A4"; g.fillRect(0, 122, 128, 6);
    g.fillStyle = "#7E9AA3"; g.fillRect(0, 46, 128, 40); g.fillStyle = "#A9C0C6"; g.fillRect(0, 46, 128, 9); g.fillStyle = "#EFEAD8"; g.fillRect(0, 43, 128, 3); g.fillRect(0, 86, 128, 3);
    g.fillStyle = "#EFEAD8"; for (let x = 0; x < 128; x += 32) g.fillRect(x, 46, 3, 40);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function wallTexture(THREE, wall, glass, shed) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
  if (shed) {                                                               // a small building: plain wall, a door and a small window (no office window bands)
    g.fillStyle = glass; g.fillRect(16, 46, 34, 30); g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(16, 46, 34, 6);
    g.fillStyle = "#6B5446"; g.fillRect(78, 52, 30, 76); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 120, 128, 8);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  g.fillStyle = glass; g.fillRect(10, 34, 108, 52);                          // ribbon window
  g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(10, 34, 108, 8);         // sky reflection
  g.fillStyle = wall; for (const x of [37, 64, 91]) g.fillRect(x, 34, 3, 52); // mullions
  g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(0, 120, 128, 8);              // floor slab shadow
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Ridge of a hip roof: the footprint's long axis, shortened by half its width at each end. R(p) = nearest ridge point; W = footprint width (m). */
function hipRidge(pts) {
  const n = pts.length, cx = pts.reduce((a, p) => a + p[0], 0) / n, cz = pts.reduce((a, p) => a + p[1], 0) / n;
  let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of pts) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
  const th = 0.5 * Math.atan2(2 * sxz, sxx - szz), u = [Math.cos(th), Math.sin(th)], v = [-u[1], u[0]];
  const pu = pts.map(p => (p[0] - cx) * u[0] + (p[1] - cz) * u[1]), pv = pts.map(p => (p[0] - cx) * v[0] + (p[1] - cz) * v[1]);
  const u0 = Math.min(...pu), u1 = Math.max(...pu), v0 = Math.min(...pv), v1 = Math.max(...pv), W = v1 - v0, vm = (v0 + v1) / 2;
  const a = Math.min(u0 + W / 2, (u0 + u1) / 2), b = Math.max(u1 - W / 2, (u0 + u1) / 2);
  const R = p => { const t = Math.max(a, Math.min(b, (p[0] - cx) * u[0] + (p[1] - cz) * u[1])); return [cx + t * u[0] + vm * v[0], cz + t * u[1] + vm * v[1]]; };
  return { R, W: Math.min(W, u1 - u0) };
}

class Mesher {                                    // accumulates non-indexed triangles
  constructor() { this.p = []; this.uv = []; this.c = []; this.runs = []; }
  use(m) { const r = this.runs; if (!r.length || r[r.length - 1].m !== m) r.push({ m, start: this.p.length / 3 }); }   // the material index (of a material array) for the triangles that follow
  tri(a, b, c, col, uvs) { for (const v of [a, b, c]) this.p.push(v[0], v[1], v[2]); for (let i = 0; i < 3; i++) { this.c.push(col.r, col.g, col.b); this.uv.push(...(uvs ? uvs[i] : [0, 0])); } }
  quad(a, b, c, d, col, uvs) { this.tri(a, b, c, col, uvs && [uvs[0], uvs[1], uvs[2]]); this.tri(a, c, d, col, uvs && [uvs[0], uvs[2], uvs[3]]); }
  geometry(THREE, withColor) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    if (withColor) g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    if (this.runs.some(r => r.m !== 0)) this.runs.forEach((r, i) => g.addGroup(r.start, (i + 1 < this.runs.length ? this.runs[i + 1].start : this.p.length / 3) - r.start, r.m));
    g.computeVertexNormals(); return g;
  }
}

export function createBuildings(THREE, data, W, H) {
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K;
  const byId = new Map(data.buildings.map(b => [b.id, b])), group = new THREE.Group(), pickables = [], parts = new Map(), tops = new Map();
  const wallMats = new Map(), col = c => new THREE.Color(c);
  // Adelson model materials: concrete (vertex-coloured), glass with vertical louvers, dark glazing, a red flower bed
  const creamMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const elpernModel = b => {                                                  // built on the building's own (poster) outline: the model gives the body polygon, the lobby polygon and which lobby edge is shared
    const m = b.model, W2 = pt => [wx(pt[0]), wz(pt[1])];
    return createElpern(THREE, { body: m.body.map(W2), lobby: m.lobby.map(W2), shared: i => m.shared.includes(i), door: m.door && m.door.map(W2) }, { cream: creamMat, glass: new THREE.MeshLambertMaterial({ color: "#8FB0B0", side: THREE.DoubleSide, flatShading: true }), dark: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }) });
  };
  const oferModel = b => {                                                    // the Ofer Lecture Halls: placed by the centre and direction of its rectangle (image px), sized in metres
    const [cx, cy] = b.model.center, [dx, dy] = b.model.dir, rot = Math.atan2(-dy, dx);
    return createOfer(THREE, { x: wx(cx), z: wz(cy), rot }, b.model.length, b.model.width, { cream: creamMat, glass: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }) });
  };
  const auditoriumModel = b => {
    const tex = (draw, w, h, repeat) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c2 = cv.getContext("2d"); draw(c2); const t = new THREE.CanvasTexture(cv); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const ribs = tex(c2 => { c2.fillStyle = "#E7E2CC"; c2.fillRect(0, 0, 16, 16); c2.fillStyle = "#CFC9AF"; c2.fillRect(0, 0, 2, 16); }, 16, 16, true); ribs.repeat.set(36, 1);       // fine vertical ribs around the dome
    const signTex = tex(c2 => { c2.fillStyle = "#D9D5C4"; c2.fillRect(0, 0, 512, 70); if (c2.fillText) { c2.fillStyle = "#2B2B2B"; c2.font = "bold 22px system-ui, sans-serif"; c2.textAlign = "left"; c2.fillText("IVCHER AUDITORIUM", 12, 44); c2.textAlign = "right"; c2.fillText("אודיטוריום איבצ'ר", 500, 44); } }, 512, 70, false);
    const glassTex = tex(c2 => { c2.fillStyle = "#B59A6A"; c2.fillRect(0, 0, 64, 64); c2.fillStyle = "#EAD9AE"; c2.fillRect(0, 0, 64, 24); c2.fillStyle = "#2B2F36"; c2.fillRect(30, 0, 3, 64); c2.fillRect(0, 0, 64, 2); }, 64, 64, false);   // warm lit interior behind dark frames
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createAuditorium(THREE, { x: wx(cx), z: wz(cy), rot }, { dome: new THREE.MeshLambertMaterial({ map: ribs }), cap: new THREE.MeshLambertMaterial({ color: "#B9B4A0", flatShading: true }), cream: creamMat,
      glass: new THREE.MeshLambertMaterial({ map: glassTex, side: THREE.DoubleSide }), roof: new THREE.MeshLambertMaterial({ color: "#8E949B", flatShading: true, side: THREE.DoubleSide }), sign: new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }) });
  };
  const arabovModel = b => {
    const tex = (draw, w, h, repeat) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c2 = cv.getContext("2d"); draw(c2); const t = new THREE.CanvasTexture(cv); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const stoneTex = tex(c2 => { c2.fillStyle = "#EAE5D7"; c2.fillRect(0, 0, 64, 64); c2.fillStyle = "#D4CEBD"; c2.fillRect(0, 31, 64, 2); c2.fillRect(0, 0, 64, 1); c2.fillRect(31, 0, 2, 31); c2.fillRect(15, 33, 2, 31); c2.fillRect(47, 33, 2, 31); }, 64, 64, true);   // limestone panels
    const fit = (c2, text, y, px, maxW) => { c2.font = `bold ${px}px system-ui, sans-serif`; while (c2.measureText && c2.measureText(text).width > maxW && px > 10) { px -= 1; c2.font = `bold ${px}px system-ui, sans-serif`; } c2.fillText(text, 128, y); };   // shrink a line until it fits the panel
    const sign = (hebrew, latin) => new THREE.MeshBasicMaterial({ map: tex(c2 => { c2.fillStyle = "#EFEBDE"; c2.fillRect(0, 0, 256, 100); if (c2.fillText) { c2.fillStyle = "#1E1E1E"; c2.textAlign = "center"; fit(c2, hebrew, 42, 34, 232); fit(c2, latin, 84, 30, 232); } }, 256, 100, false) });
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createArabov(THREE, { x: wx(cx), z: wz(cy), rot }, { stone: new THREE.MeshLambertMaterial({ map: stoneTex, flatShading: true, side: THREE.DoubleSide }), cream: creamMat, dark: new THREE.MeshLambertMaterial({ color: "#2F3B4A", flatShading: true, side: THREE.DoubleSide }),
      signs: { arabov: sign("שער ארבוב", "Arabov Gate"), idc: sign("הבינתחומי הרצליה", "IDC HERZLIYA") } });
  };
  let dormFacade = null;
  const dormModel = b => {
    if (!dormFacade) {                                                      // one tile = 3 bays x 4 floors: white wall, small dark windows, a staggered pattern of dark vertical panels
      const cv = document.createElement("canvas"); cv.width = 192; cv.height = 248; const c2 = cv.getContext("2d");
      c2.fillStyle = "#EAE7DE"; c2.fillRect(0, 0, 192, 248);
      for (let f = 0; f < 4; f++) {
        const y = f * 62; c2.fillStyle = "#C9C6BD"; c2.fillRect(0, y, 192, 3);
        for (let bay = 0; bay < 3; bay++) { const x = bay * 64; c2.fillStyle = "#2B323E"; c2.fillRect(x + 22, y + 16, 22, 26); c2.fillStyle = "#5B6A80"; c2.fillRect(x + 22, y + 16, 22, 7); }
      }
      c2.fillStyle = "#3C4849";                                              // dark green-grey vertical panels, two floors tall, staggered
      for (const [bx, fy, w] of [[6, 0, 12], [98, 1, 12], [150, 2, 12], [52, 2, 10]]) c2.fillRect(bx, fy * 62 + 3, w, 120);
      dormFacade = new THREE.CanvasTexture(cv); dormFacade.wrapS = dormFacade.wrapT = THREE.RepeatWrapping; dormFacade.colorSpace = THREE.SRGBColorSpace; dormFacade.anisotropy = 4;
    }
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createDorm(THREE, { x: wx(cx), z: wz(cy), rot }, { facade: new THREE.MeshLambertMaterial({ map: dormFacade, flatShading: true, side: THREE.DoubleSide }), cream: creamMat, dark: new THREE.MeshLambertMaterial({ color: "#3A4658", flatShading: true, side: THREE.DoubleSide }),
      wood: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), grey: new THREE.MeshLambertMaterial({ color: "#8E9096", flatShading: true }) }, b.id);
  };
  const hangarModel = b => {
    const tex = (draw, w, h, repeat) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c2 = cv.getContext("2d"); draw(c2); const t = new THREE.CanvasTexture(cv); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const louverTex = tex(c2 => { c2.fillStyle = "#2D3138"; c2.fillRect(0, 0, 16, 16); c2.fillStyle = "#59606C"; c2.fillRect(0, 0, 16, 5); c2.fillStyle = "#171A1F"; c2.fillRect(0, 13, 16, 3); }, 16, 16, true);        // horizontal metal louvers
    const signTex = tex(c2 => { c2.fillStyle = "#DCD9D0"; c2.fillRect(0, 0, 512, 110); if (c2.fillText) { c2.fillStyle = "#1E2228"; c2.textAlign = "center"; c2.font = "bold 36px system-ui, sans-serif"; c2.fillText("אולמות קרול וג'ואי לאו", 256, 44); c2.font = "bold 28px system-ui, sans-serif"; c2.fillText("CAROL AND JOEY LOW LECTURE HALLS", 256, 88); } }, 512, 110, false);
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createHangar(THREE, { x: wx(cx), z: wz(cy), rot }, { cream: creamMat, louver: new THREE.MeshLambertMaterial({ map: louverTex, flatShading: true, side: THREE.DoubleSide }), roof: new THREE.MeshLambertMaterial({ color: "#B9BBBE", flatShading: true, side: THREE.DoubleSide }),
      glass: new THREE.MeshLambertMaterial({ color: "#9FB7C7", flatShading: true, side: THREE.DoubleSide }), grey: new THREE.MeshLambertMaterial({ color: "#9A968C", flatShading: true }), sign: new THREE.MeshBasicMaterial({ map: signTex }) });
  };
  const jusidmanModel = b => {
    const mk = (draw, w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c2 = cv.getContext("2d"); draw(c2); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const glassTex = mk(c2 => { c2.fillStyle = "#C9D3DC"; c2.fillRect(0, 0, 64, 64); c2.fillStyle = "#7C8FA3"; c2.fillRect(0, 0, 64, 20); c2.fillStyle = "#EFE3C2"; c2.fillRect(0, 36, 64, 28); c2.fillStyle = "#38424F"; c2.fillRect(0, 0, 3, 64); }, 64, 64);   // warm interior glow behind the glass
    const bandTex = mk(c2 => { c2.fillStyle = "#4B5C74"; c2.fillRect(0, 0, 64, 64); c2.fillStyle = "#8FA3BD"; c2.fillRect(0, 0, 64, 16); c2.fillStyle = "#F1EEE6"; c2.fillRect(0, 0, 6, 64); }, 64, 64);
    const signTex = mk(c2 => { c2.fillStyle = "#F2EFE7"; c2.fillRect(0, 0, 512, 100); if (c2.fillText) { c2.fillStyle = "#222"; c2.textAlign = "center"; c2.font = "bold 30px system-ui, sans-serif"; c2.fillText("מרכז דניאל חוסידמן לכנסים", 256, 40); c2.font = "bold 22px system-ui, sans-serif"; c2.fillText("DANIEL JUSIDMAN CONFERENCE CENTER", 256, 78); } }, 512, 100);
    const outline = b.poly.map(([x, y]) => [wx(x), wz(y)]);
    return createJusidman(THREE, outline, b.model.front, { cream: creamMat, glass: new THREE.MeshLambertMaterial({ map: glassTex, flatShading: true, side: THREE.DoubleSide }), band: new THREE.MeshLambertMaterial({ map: bandTex, flatShading: true, side: THREE.DoubleSide }),
      dark: new THREE.MeshLambertMaterial({ color: "#3C4756", side: THREE.DoubleSide }),
      sign: new THREE.MeshBasicMaterial({ map: signTex }) }, b.model.signToward && [wx(b.model.signToward[0]), wz(b.model.signToward[1])]);   // signToward: the library, which the name sign faces
  };
  const ivcherModel = b => {
    const gc = document.createElement("canvas"); gc.width = 64; gc.height = 128; const g2 = gc.getContext("2d");
    g2.fillStyle = "#6E86A6"; g2.fillRect(0, 0, 64, 128); g2.fillStyle = "#8FA6C2"; g2.fillRect(0, 0, 64, 18);                  // a sky-blue reflecting glass, brighter near the top of each floor
    g2.fillStyle = "#1E2733"; g2.fillRect(0, 0, 3, 128); g2.fillStyle = "#EDEAE0"; g2.fillRect(0, 124, 64, 4);                  // thin dark mullions, a pale floor edge
    const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 4;
    const sc = document.createElement("canvas"); sc.width = 512; sc.height = 256; const sg = sc.getContext("2d");
    sg.fillStyle = "#E9E5DB"; sg.fillRect(0, 0, 512, 256);
    if (sg.fillText) { sg.fillStyle = "#222"; sg.textAlign = "center"; sg.font = "bold 22px system-ui, sans-serif"; sg.fillText("בית ספר ברוך איבצ'ר לפסיכולוגיה", 256, 52); sg.font = "bold 17px system-ui, sans-serif"; sg.fillText("BARUCH IVCHER SCHOOL OF PSYCHOLOGY", 256, 80);
      sg.font = "bold 22px system-ui, sans-serif"; sg.fillText("בית ספר טיומקין לכלכלה", 256, 150); sg.font = "bold 17px system-ui, sans-serif"; sg.fillText("TIOMKIN SCHOOL OF ECONOMICS", 256, 178); }
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 4;
    const dc = document.createElement("canvas"); dc.width = 64; dc.height = 64; const d2 = dc.getContext("2d"); d2.fillStyle = "#A9B8C8"; d2.fillRect(0, 0, 64, 64); d2.fillStyle = "#2A3340"; d2.fillRect(30, 0, 4, 64); d2.fillRect(0, 0, 64, 3);
    const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createIvcher(THREE, { x: wx(cx), z: wz(cy), rot }, { cream: creamMat, glass: new THREE.MeshLambertMaterial({ map: gt, flatShading: true, side: THREE.DoubleSide }), dark: new THREE.MeshLambertMaterial({ color: "#46566E", flatShading: true }),
      brick: new THREE.MeshBasicMaterial({ color: "#B9786A", side: THREE.DoubleSide }), sign: new THREE.MeshBasicMaterial({ map: st }), doors: new THREE.MeshBasicMaterial({ map: dt }) });
  };
  const radzynerModel = b => {
    const sc = document.createElement("canvas"); sc.width = 512; sc.height = 64; const sg = sc.getContext("2d");
    sg.fillStyle = "#EFEBE1"; sg.fillRect(0, 0, 512, 64);
    if (sg.fillText) { sg.fillStyle = "#2B2B2B"; sg.textAlign = "center"; sg.font = "bold 26px system-ui, sans-serif"; sg.fillText("בניין רדזינר למנהלה", 256, 27); sg.font = "bold 22px system-ui, sans-serif"; sg.fillText("RADZYNER ADMINISTRATION BUILDING", 256, 54); }
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 4;
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createRadzyner(THREE, { x: wx(cx), z: wz(cy), rot }, { cream: creamMat, dark: new THREE.MeshLambertMaterial({ color: "#3A4253", flatShading: true }), blue: new THREE.MeshLambertMaterial({ color: "#2F6FD0", flatShading: true }),
      brick: new THREE.MeshBasicMaterial({ color: "#C98068", side: THREE.DoubleSide }), hedge: new THREE.MeshLambertMaterial({ color: "#3F7A4A", flatShading: true }), sign: new THREE.MeshBasicMaterial({ map: st }) });
  };
  const adelsonModel = b => {
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 128; const g2 = cv.getContext("2d");
    g2.fillStyle = "#34445E"; g2.fillRect(0, 0, 128, 128);
    for (let x = 4; x < 128; x += 8) { g2.fillStyle = "#8FA3BC"; g2.fillRect(x, 6, 3, 116); g2.fillStyle = "#1F2C42"; g2.fillRect(x + 3, 6, 1, 116); }   // vertical louver blades
    g2.fillStyle = "#EEEAE0"; g2.fillRect(0, 0, 128, 6); g2.fillRect(0, 122, 128, 6);                                                              // floor slabs
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const [cx, cy] = b.model.center, dir = b.model.dir, rot = Math.atan2(-dir[1], dir[0]);
    return createAdelson(THREE, { x: wx(cx), z: wz(cy), rot }, { cream: creamMat, glass: new THREE.MeshLambertMaterial({ map: tex, flatShading: true, side: THREE.DoubleSide }), dark: new THREE.MeshLambertMaterial({ color: "#2A3447", flatShading: true }), red: new THREE.MeshLambertMaterial({ color: "#C8352B" }) });
  };
  const wallMat = (fill, shed, style) => { const key = fill + (shed ? "s" : "") + (style || ""); if (STYLED.has(style)) { if (!wallMats.has(key)) wallMats.set(key, new THREE.MeshLambertMaterial({ map: style === "wood" ? woodTexture(THREE) : style === "stone" ? stoneTexture(THREE) : style === "glassfins" || style === "whitebox" || style === "glassbridge" || style === "innovation" ? arisonTexture(THREE, style) : style === "lawschool" || style === "curtain" || style === "lockers" ? lawTexture(THREE, style) : arazTexture(THREE, style), flatShading: true })); return wallMats.get(key); } if (!wallMats.has(key)) { const w = col(fill).lerp(col("#F4F1EC"), 0.6); wallMats.set(key, new THREE.MeshLambertMaterial({ map: wallTexture(THREE, "#" + w.getHexString(), GLASS, shed), flatShading: true })); } return wallMats.get(key); };
  const limeWall = new THREE.MeshLambertMaterial({ map: wallTexture(THREE, "#" + col(LIME).lerp(col("#FFFFFF"), 0.45).getHexString(), GLASS), flatShading: true });
  const limeWallModel = new THREE.MeshLambertMaterial({ color: col(LIME).lerp(col("#FFFFFF"), 0.45), flatShading: true, side: THREE.DoubleSide }), limeTopModel = new THREE.MeshLambertMaterial({ color: LIME, flatShading: true, side: THREE.DoubleSide });   // the hand-built models are drawn with no UVs and with mixed winding: highlight them in plain two-sided lime, or half of every face vanishes
  const topMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), limeTop = new THREE.MeshLambertMaterial({ color: LIME, flatShading: true });

  // flat signs and glass bays placed on one wall of a building: {edge, s0, s1 (fractions along it), y0, y1 (m above the building's own base), kind: "sign"|"glass", text}
  const decalTex = new Map();
  const makeDecal = (b, d, pts, inXZ, base, top) => {
    const A = pts[d.edge], B = pts[(d.edge + 1) % pts.length], ex = B[0] - A[0], ez = B[1] - A[1], len = Math.hypot(ex, ez), nx0 = -ez / len, nz0 = ex / len, mid = [(A[0] + B[0]) / 2 + nx0 * 0.2, (A[1] + B[1]) / 2 + nz0 * 0.2], s = (inXZ(mid) ? -1 : 1) * (d.flip ? -1 : 1), nx = nx0 * s, nz = nz0 * s;
    const key = d.kind + (d.text || ""); if (!decalTex.has(key)) { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const g2 = cv.getContext("2d");
      if (d.kind === "sign") { g2.fillStyle = "rgba(0,0,0,0)"; g2.clearRect(0, 0, 512, 128); if (g2.fillText) { g2.fillStyle = "#26303C"; g2.textAlign = "center"; g2.font = "bold 40px system-ui, sans-serif"; g2.fillText(d.text[0], 256, 50, 496); g2.font = "bold 32px system-ui, sans-serif"; g2.fillText(d.text[1], 256, 100, 496); } }
      else if (d.kind === "banner") { g2.fillStyle = "#12337F"; g2.fillRect(0, 0, 512, 128); g2.fillStyle = "#FFFFFF"; for (const [x, y] of [[300, 40], [340, 62], [380, 52], [420, 78]]) g2.fillRect(x, y, 6, 6); if (g2.fillText) { g2.textAlign = "center"; g2.font = "bold 26px system-ui, sans-serif"; g2.fillText("הבינתחומי הרצליה", 150, 70); g2.font = "bold 20px system-ui, sans-serif"; g2.fillText("IDC HERZLIYA", 150, 100); } }
      else if (d.kind === "glassbridge") { g2.fillStyle = "#4E8F9A"; g2.fillRect(0, 0, 512, 128); g2.fillStyle = "#7FB7BF"; for (let y = 0; y < 128; y += 32) g2.fillRect(0, y + 4, 512, 22); g2.fillStyle = "#D9DDD6"; for (let y = 0; y < 128; y += 32) g2.fillRect(0, y, 512, 4); g2.fillStyle = "#2E4A55"; for (let x = 0; x < 512; x += 64) g2.fillRect(x, 0, 3, 128); }
      else if (d.kind === "door") { g2.fillStyle = "#2C3440"; g2.fillRect(0, 0, 512, 128); g2.fillStyle = "#6F8497"; g2.fillRect(18, 10, 226, 108); g2.fillRect(268, 10, 226, 108); g2.fillStyle = "#E8ECEA"; g2.fillRect(0, 0, 512, 8); g2.fillRect(250, 0, 12, 128); }
      else { g2.fillStyle = "#5B3A2E"; g2.fillRect(0, 0, 512, 128); g2.fillStyle = "#9FB4C4"; g2.fillRect(22, 16, 468, 44); g2.fillRect(22, 70, 468, 44); g2.fillStyle = "#E2EAF0"; g2.fillRect(22, 16, 468, 8); g2.fillRect(22, 70, 468, 8); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; decalTex.set(key, t); }
    const w = (d.s1 - d.s0) * len, h = d.y1 - d.y0, cx = A[0] + ex * (d.s0 + d.s1) / 2 + nx * 0.12, cz = A[1] + ez * (d.s0 + d.s1) / 2 + nz * 0.12;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: decalTex.get(key), transparent: d.kind === "sign" }));
    m.position.set(cx, base + (d.y0 + d.y1) / 2, cz); m.rotation.y = Math.atan2(nx, nz); return m;
  };
  for (const b of data.buildings) {
    if (b.hidden) continue;                          // underground: kept in the data for its pin and its legend card, but not drawn
    if (b.model) {                                    // a hand-built model (modelled from photos): concrete + glass meshes, picked and highlighted as one building
      const m = b.model.type === "radzyner" ? radzynerModel(b) : b.model.type === "ivcher" ? ivcherModel(b) : b.model.type === "jusidman" ? jusidmanModel(b) : b.model.type === "hangar" ? hangarModel(b) : b.model.type === "dorm" ? dormModel(b) : b.model.type === "arabov" ? arabovModel(b) : b.model.type === "auditorium" ? auditoriumModel(b) : b.model.type === "elpern" ? elpernModel(b) : b.model.type === "ofer" ? oferModel(b) : adelsonModel(b), wall = m.glass || m.wall; group.add(m.group); for (const mesh of [wall, m.cream]) { mesh.userData.id = b.id; pickables.push(mesh); }
      parts.set(b.id, { wall, top: m.cream, wallMat: wall.material, model: true }); tops.set(b.id, m.height + 1.5); continue;
    }
    const parent = b.parent != null ? byId.get(b.parent) : null, y0 = parent ? parent.height : 0, y1 = b.height, plan = roofPlan(b);
    const pts = b.poly.map(([x, y]) => [wx(x), wz(y)]), inXZ = pt => pointInPoly(pt, pts);
    const shed = plan.kind === "hip", walls = new Mesher(), top = new Mesher(), roofCol = col((STYLED.has(b.style) && b.style !== "wood") ? "#CFCABD" : b.fill), paraOut = roofCol.clone().lerp(col("#FFFFFF"), 0.4), paraIn = roofCol.clone().multiplyScalar(0.8);
    let run = 0;
    const edgeStyles = [...new Set((b.edgeStyle || []).map(e => e.style))], styleOf = i => { const e = (b.edgeStyle || []).find(r => i >= r.from && i <= r.to); return e ? 1 + edgeStyles.indexOf(e.style) : 0; };   // b.edgeStyle: walls (edge index ranges) in a different style from the rest
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i], B = pts[(i + 1) % pts.length], ex = B[0] - A[0], ez = B[1] - A[1], len = Math.hypot(ex, ez); if (len < 0.01) continue;
      const mid = [(A[0] + B[0]) / 2 + (-ez / len) * 0.2, (A[1] + B[1]) / 2 + (ex / len) * 0.2], flip = inXZ(mid);   // (-ez,ex) is outward unless it points inside
      const q = (yb, yt) => flip ? [[B[0], yb, B[1]], [A[0], yb, A[1]], [A[0], yt, A[1]], [B[0], yt, B[1]]] : [[A[0], yb, A[1]], [B[0], yb, B[1]], [B[0], yt, B[1]], [A[0], yt, A[1]]];
      const u0 = run / BAY, u1 = (run + len) / BAY, v0 = shed ? 0 : y0 / (FLOOR_BY_STYLE[b.style] ?? FLOOR), v1 = shed ? 1 : y1 / (FLOOR_BY_STYLE[b.style] ?? FLOOR), [p0, p1, p2, p3] = q(y0, y1);
      const uvs = flip ? [[u1, v0], [u0, v0], [u0, v1], [u1, v1]] : [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      walls.use(styleOf(i)); walls.quad(p0, p1, p2, p3, new THREE.Color(1, 1, 1), uvs);
      if (plan.parapet > 0) {                                                    // parapet: outer band lighter, inner face darker
        const [a0, a1, a2, a3] = q(y1, y1 + plan.parapet); top.quad(a0, a1, a2, a3, paraOut);
        const [b0, b1, b2, b3] = q(y1, y1 + plan.parapet); top.quad(b1, b0, b3, b2, paraIn);
      }
      run += len;
    }
    // roof surface (triangulated), always facing up
    const idx = THREE.ShapeUtils.triangulateShape(pts.map(p => new THREE.Vector2(p[0], p[1])), []);
    const cen = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
    const ridge = plan.kind === "hip" ? hipRidge(pts) : null, hipH = ridge ? Math.max(1.8, Math.min(4, 0.4 * ridge.W)) : 0;
    const roofColor = plan.kind === "hip" ? col(b.style === "wood" ? "#7C4A38" : TERRACOTTA) : roofCol;
    if (plan.kind === "hip") {                                                   // each edge rises to the ridge (two triangles for the long sides, one for the ends)
      const up = (tri, shade) => { const n = (tri[1][0] - tri[0][0]) * (tri[2][2] - tri[0][2]) - (tri[1][2] - tri[0][2]) * (tri[2][0] - tri[0][0]); top.tri(...(n > 0 ? [tri[1], tri[0], tri[2]] : [tri[0], tri[1], tri[2]]), roofColor.clone().multiplyScalar(shade)); };
      for (let i = 0; i < pts.length; i++) {
        const A = pts[i], B = pts[(i + 1) % pts.length], ra = ridge.R(A), rb = ridge.R(B), shade = 0.85 + 0.15 * Math.sin(i * 1.7);
        const P = (p, y) => [p[0], y, p[1]];
        up([P(A, y1), P(B, y1), P(rb, y1 + hipH)], shade);
        if (Math.hypot(ra[0] - rb[0], ra[1] - rb[1]) > 1e-6) up([P(A, y1), P(rb, y1 + hipH), P(ra, y1 + hipH)], shade);
      }
    } else for (let t = 0; t < idx.length; t++) {
      const [a, b2, c] = idx[t].map(k => [pts[k][0], y1, pts[k][1]]), ny = (b2[0] - a[0]) * (c[2] - a[2]) - (b2[2] - a[2]) * (c[0] - a[0]);
      top.tri(...(ny < 0 ? [a, b2, c] : [a, c, b2]), roofColor);
    }
    const addBox = (cx, cz, tx, tz, w, d, ya, yb, color) => {                     // an oriented box: centre, unit tangent, width along it, depth across it
      const nx = tz, nz = -tx, c4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, bb]) => [cx + tx * a * w / 2 + nx * bb * d / 2, cz + tz * a * w / 2 + nz * bb * d / 2]);
      top.quad([c4[0][0], yb, c4[0][1]], [c4[1][0], yb, c4[1][1]], [c4[2][0], yb, c4[2][1]], [c4[3][0], yb, c4[3][1]], color);
      for (let k = 0; k < 4; k++) { const A = c4[k], B = c4[(k + 1) % 4], f = [1, 0.85, 0.7, 0.9][k]; top.quad([A[0], ya, A[1]], [B[0], ya, B[1]], [B[0], yb, B[1]], [A[0], yb, A[1]], color.clone().multiplyScalar(f)); }
    };
    if (b.style === "glassfins") {                                                // the Lauder wing: white teeth along the east roof edge, concrete balcony bays on the sunken-walkway side
      const white = col("#F1EFE8"), concrete = col("#B9B7AF");
      for (let i = 0; i < pts.length; i++) {
        const A = pts[i], B = pts[(i + 1) % pts.length], ex = B[0] - A[0], ez = B[1] - A[1], len = Math.hypot(ex, ez); if (len < 4) continue;
        const tx = ex / len, tz = ez / len, mid = [(A[0] + B[0]) / 2 + (-tz) * 0.2, (A[1] + B[1]) / 2 + tx * 0.2], s = inXZ(mid) ? 1 : -1, nxo = -tz * -s * -1, nzo = tx * -s * -1;   // outward normal
        const ox = s > 0 ? tz : -tz, oz = s > 0 ? -tx : tx;
        if (ox > 0.6) for (let t = 1.2; t < len - 1.2; t += 3.2) addBox(A[0] + tx * t, A[1] + tz * t, tx, tz, 1.3, 0.5, y1 + plan.parapet, y1 + plan.parapet + 1.0, white);
        if (ox < -0.6 && len > 9) for (const f of [0.28, 0.72]) for (const [ya, yb] of [[4.0, 7.2], [8.2, 11.4]]) addBox(A[0] + ex * f + ox * 1.4, A[1] + ez * f + oz * 1.4, tx, tz, 4.2, 2.8, ya, yb, concrete);
      }
    }
    if (b.core != null) for (const e of innovationExtras(pts, b.core, y1 + plan.parapet)) addBox(e.cx, e.cz, e.tx, e.tz, e.w, e.d, e.ya, e.yb, col(e.color));   // the Innovation Centre's beige corner core, vents and lamp posts
    for (const p of plan.props) {                                                // rooftop boxes
      const cx = wx(p.x), cz = wz(p.y), hw = p.w / 2, hd = p.d / 2, yb = y1, yt = y1 + p.h, pc = col(PROP);
      const V = [[cx - hw, yb, cz - hd], [cx + hw, yb, cz - hd], [cx + hw, yb, cz + hd], [cx - hw, yb, cz + hd], [cx - hw, yt, cz - hd], [cx + hw, yt, cz - hd], [cx + hw, yt, cz + hd], [cx - hw, yt, cz + hd]];
      top.quad(V[4], V[7], V[6], V[5], pc);
      top.quad(V[0], V[4], V[5], V[1], pc.clone().multiplyScalar(0.9)); top.quad(V[1], V[5], V[6], V[2], pc.clone().multiplyScalar(0.8));
      top.quad(V[2], V[6], V[7], V[3], pc.clone().multiplyScalar(0.9)); top.quad(V[3], V[7], V[4], V[0], pc.clone().multiplyScalar(0.8));
      const dark = col("#59606A");                                               // what makes each kind read as plant, not a blank crate
      if (p.kind === "ahu") addBox(cx, cz, 1, 0, p.w + 0.08, p.d + 0.08, yb + p.h * 0.3, yb + p.h * 0.58, dark);                                 // a dark louvre band round the unit
      else if (p.kind === "fan") { const f = Math.min(p.w, p.d) * 0.62; addBox(cx, cz, 1, 0, f, f, yt, yt + 0.1, dark); addBox(cx, cz, 1, 0, f * 0.3, f * 0.3, yt + 0.1, yt + 0.22, pc.clone().multiplyScalar(0.7)); }   // a dark fan deck with a hub
      else { addBox(cx + hw * 0.45, cz, 1, 0, 0.55, 0.55, yt, yt + 1.7, pc.clone().multiplyScalar(0.75)); addBox(cx + hw * 0.45, cz, 1, 0, 0.9, 0.9, yt + 1.7, yt + 1.8, dark); }   // an exhaust stack with a cap
    }
    const wallMaterial = edgeStyles.length ? [wallMat(b.fill, shed, b.style), ...edgeStyles.map(st => wallMat(b.fill, shed, st))] : wallMat(b.fill, shed, b.style);
    const wm = new THREE.Mesh(walls.geometry(THREE, false), wallMaterial), tm = new THREE.Mesh(top.geometry(THREE, true), topMat);
    for (const m of [wm, tm]) { m.castShadow = true; m.userData.id = b.id; group.add(m); pickables.push(m); }
    parts.set(b.id, { wall: wm, top: tm, wallMat: wallMaterial });
    for (const d of b.decals || []) group.add(makeDecal(b, d, pts, inXZ, y0, y1));
    tops.set(b.id, y1 + plan.parapet + hipH + (plan.props.length ? Math.max(...plan.props.map(p => p.h)) : 0));
  }

  let lit = [];
  const family = id => [id, ...data.buildings.filter(x => x.parent === id).map(x => x.id)];
  function setHighlight(ids) {
    for (const id of lit) { const p = parts.get(id); p.wall.material = p.wallMat; p.top.material = p.model ? creamMat : topMat; }
    lit = ids.filter(id => parts.has(id));
    for (const id of lit) { const p = parts.get(id); p.wall.material = p.model ? limeWallModel : limeWall; p.top.material = p.model ? limeTopModel : limeTop; }
  }
  return { group, byId, pickables, setHighlight, topY: id => tops.get(id) ?? 0, family };
}
