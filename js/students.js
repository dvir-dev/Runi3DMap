// Instanced low-poly students with a real walk cycle: swinging arms, thighs + shins with knee bend, shoes, body bob, lean and twist.
import { K } from "./geo.js";
import { createAgent, stepAgent, STUDENT_SCALE } from "./agent.js";

const SHIRTS = ["#00378B", "#2F5FB8", "#0A2F6E", "#87B314", "#EB690B", "#FFFFFF", "#C9C5BC", "#4DB4D3", "#9FA0CC", "#DC7360"];
const SKINS = ["#F2C9A5", "#E0A878", "#C68642", "#8D5524", "#F5D7BE"];
const HAIRS = ["#2B1B12", "#4A3020", "#8A5A2B", "#D9B15F", "#1C1C1C", "#7A3B2B"];
const PANTS = ["#2B3A55", "#3B3B45", "#5B6B8C", "#4A4A3A"];
const PACKS = ["#EB690B", "#2F5FB8", "#3B3B45", "#87B314"];
const SCREEN_PX = 9, MAX_SCALE = 6;               // far away a student is drawn up to MAX_SCALE x so it stays at least ~9 px tall

/** @param o {nav, pois, count, W, H, rect, capacity?} */
export function createStudents(THREE, { nav, pois, count, W, H, rect, capacity = count }) {
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K;
  const group = new THREE.Group(); group.userData.isStudents = true;
  const lam = vc => new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, vertexColors: !!vc });
  const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, capacity); m.frustumCulled = false; m.count = 0; group.add(m); return m; };
  const tint = (geo, hex) => { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); return geo.index ? geo.toNonIndexed() : geo; };
  const merge = geos => { const p = [], c = []; for (const g of geos) { p.push(...g.attributes.position.array); c.push(...g.attributes.color.array); } const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); m.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); m.computeVertexNormals(); return m; };
  const box = (w, h, d, x, y, z, hex) => tint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex);

  // pivots sit at the joint: thigh at the hip, shin at the knee, arm at the shoulder
  const thighGeo = new THREE.BoxGeometry(0.2, 0.44, 0.21).translate(0, -0.22, 0), armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.14).translate(0, -0.25, 0);
  const shinGeo = merge([box(0.18, 0.42, 0.19, 0, -0.21, 0, "#FFFFFF"), box(0.2, 0.1, 0.34, 0, -0.45, 0.07, "#2A2A35")]);   // leg + shoe
  const part = {
    torso: mk(new THREE.BoxGeometry(0.48, 0.64, 0.27).translate(0, 1.14, 0), lam()),
    head: mk(new THREE.SphereGeometry(0.2, 7, 6).translate(0, 1.64, 0), lam()),
    hair: mk(new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.67, -0.015), lam()),
    armL: mk(armGeo, lam()), armR: mk(armGeo, lam()),
    thighL: mk(thighGeo, lam()), thighR: mk(thighGeo, lam()),
    shinL: mk(shinGeo, lam(true)), shinR: mk(shinGeo, lam(true)),
    pack: mk(new THREE.BoxGeometry(0.32, 0.4, 0.15).translate(0, 1.16, -0.2), lam()),
    shadow: mk(new THREE.CircleGeometry(0.5, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x00154a, transparent: true, opacity: 0.22, depthWrite: false })),
  };
  part.shadow.renderOrder = 1;

  let agents = [], seed = 20251016, scale = STUDENT_SCALE;
  const rng = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tmp = new THREE.Color();

  function build(n) {
    n = Math.max(0, Math.min(capacity, n)); agents = [];
    while (agents.length < n) {
      const p = pois[Math.floor(rng() * pois.length)], size = rng() < 0.15 && agents.length + 2 <= n ? 2 + Math.floor(rng() * 2) : 1;
      const lead = createAgent(agents.length, rng, [p.x, p.y]); agents.push(lead);
      for (let k = 1; k < size && agents.length < n; k++) agents.push(createAgent(agents.length, rng, [p.x, p.y], { leader: lead }));
    }
    agents.forEach((a, i) => {
      const shirt = tmp.set(SHIRTS[a.look.shirt]).clone(), pants = new THREE.Color(PANTS[(a.look.shirt + a.look.hair) % PANTS.length]);
      part.torso.setColorAt(i, shirt); part.armL.setColorAt(i, shirt); part.armR.setColorAt(i, shirt);
      part.head.setColorAt(i, tmp.set(SKINS[a.look.skin])); part.hair.setColorAt(i, tmp.set(HAIRS[a.look.hair]));
      for (const k of ["thighL", "thighR", "shinL", "shinR"]) part[k].setColorAt(i, pants);
      part.pack.setColorAt(i, tmp.set(PACKS[(a.look.hair + a.look.skin) % PACKS.length])); part.shadow.setColorAt(i, tmp.set(0xffffff));
    });
    for (const m of Object.values(part)) { m.count = n; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    write();
  }

  // scratch objects, reused every frame (no per-agent allocation)
  const base = new THREE.Matrix4(), body = new THREE.Matrix4(), M = new THREE.Matrix4(), N = new THREE.Matrix4(), T = new THREE.Matrix4(), Rm = new THREE.Matrix4();
  const q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), ZERO_Q = new THREE.Quaternion();
  const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
  const rx = a => Rm.makeRotationX(a), ry = a => Rm.makeRotationY(a), tr = (x, y, z) => T.makeTranslation(x, y, z);

  function write() {
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i], walking = a.state === "walk", ph = a.phase, s = Math.sin(ph), c = Math.cos(ph);
      const idle = Math.sin(a.idle * 1.6), bob = walking ? 0.055 * (1 + Math.cos(2 * ph)) / 2 : 0.01 * (1 + idle) / 2;
      const lean = walking ? 0.09 : 0, twist = walking ? 0.16 * s : 0.05 * Math.sin(a.idle * 0.7), swingA = walking ? 0.78 : 0, armA = walking ? 0.7 : 0.05 * idle;
      q.setFromAxisAngle(UP, Math.PI / 2 - a.heading); pos.set(wx(a.x), 0.02, wz(a.y)); sc.set(scale, scale, scale);
      base.compose(pos, q, sc);
      body.copy(base).multiply(tr(0, bob, 0)).multiply(rx(lean));                               // whole body: bob + forward lean
      M.copy(body).multiply(ry(twist));                                                          // upper body twists against the hips
      part.torso.setMatrixAt(i, M); part.head.setMatrixAt(i, M); part.hair.setMatrixAt(i, M);
      part.pack.setMatrixAt(i, a.look.pack ? M : HIDE);
      N.copy(M).multiply(tr(0.31, 1.42, 0)).multiply(rx(armA * s)); part.armL.setMatrixAt(i, N);   // arms swing opposite to the legs
      N.copy(M).multiply(tr(-0.31, 1.42, 0)).multiply(rx(-armA * s)); part.armR.setMatrixAt(i, N);
      for (const side of [1, -1]) {
        const swing = -swingA * s * side, flex = walking ? 0.95 * Math.max(0, c * side) : 0;     // knee bends while the leg swings forward
        N.copy(body).multiply(tr(0.11 * side, 0.84, 0)).multiply(rx(swing)); part[side > 0 ? "thighL" : "thighR"].setMatrixAt(i, N);
        N.multiply(tr(0, -0.44, 0)).multiply(rx(flex)); part[side > 0 ? "shinL" : "shinR"].setMatrixAt(i, N);
      }
      pos.y = 0.05; M.compose(pos, ZERO_Q, sc.set(scale * 0.95, 1, scale * 0.95)); part.shadow.setMatrixAt(i, M);
    }
    for (const m of Object.values(part)) m.instanceMatrix.needsUpdate = true;
  }

  build(count);
  return {
    group, agents: () => agents,
    get count() { return agents.length; },
    setCount: n => build(n),
    setVisible: v => { group.visible = v; },
    /** dt seconds; pxPerMeter = current on-screen scale of the ground, so far-away students get drawn bigger */
    update(dt, pxPerMeter = Infinity) {
      scale = Math.min(MAX_SCALE, Math.max(STUDENT_SCALE, SCREEN_PX / (1.7 * Math.max(pxPerMeter, 1e-6))));
      const step = Math.min(dt, 0.1), ctx = { nav, pois, rng, others: agents, pathBudget: { n: 1 } };
      for (const a of agents) stepAgent(a, step, ctx);
      write();
    },
  };
}
