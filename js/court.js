// The basketball court at the Tal Itzhaki Athletics Court (entry 2), between the two changing-room blocks: a terracotta playing surface with white lines (boundary, half-way
// line, centre circle, keys, free-throw circles, three-point arcs) and a hoop at each end. courtLayout() is the pure geometry in metres; createCourt builds the meshes.
// Drawn 1.15x life size so it reads on the map.
import { K } from "./geo.js";

export const COURT = { length: 28, width: 15, scale: 1.15, key: { w: 4.9, l: 5.8 }, circle: 1.8, three: 6.75, rim: 3.05, apron: 1.2 };

/** @returns {{lines: object[], hoops: {x: number}[], size: {l, w}}} metres, origin at the centre of the court, x along its length (z across). Lines are {kind: "rect"|"line"|"circle"|"arc", ...}. */
export function courtLayout() {
  const o = COURT, L = o.length, W = o.width, lines = [{ kind: "rect", x0: -L / 2, z0: -W / 2, x1: L / 2, z1: W / 2 }, { kind: "line", x0: 0, z0: -W / 2, x1: 0, z1: W / 2 }, { kind: "circle", x: 0, z: 0, r: o.circle }];
  const hoops = [];
  for (const s of [-1, 1]) {
    const bx = s * (L / 2);
    lines.push({ kind: "rect", x0: Math.min(bx, bx - s * o.key.l), z0: -o.key.w / 2, x1: Math.max(bx, bx - s * o.key.l), z1: o.key.w / 2 });         // the key
    lines.push({ kind: "circle", x: bx - s * o.key.l, z: 0, r: o.circle, half: -s });                                                                     // the free-throw circle (the half facing the court)
    lines.push({ kind: "arc", x: bx - s * 1.2, z: 0, r: o.three, side: -s });                                                                              // the three-point arc
    hoops.push({ x: bx + s * 0.1, side: s });
  }
  return { lines, hoops, size: { l: L, w: W } };
}

/** cfg: {at: [px, py], angle: degrees (the court's long side runs this far off the map's x axis)} */
export function createCourt(THREE, cfg, W, H) {
  const o = COURT, L = courtLayout(), g = new THREE.Group(), PPM = 40, tw = (o.length + 2 * o.apron) * PPM, th = (o.width + 2 * o.apron) * PPM;
  const cv = document.createElement("canvas"); cv.width = tw; cv.height = th; const c = cv.getContext("2d");
  const X = x => (x + o.length / 2 + o.apron) * PPM, Z = z => (z + o.width / 2 + o.apron) * PPM;
  c.fillStyle = "#4E7A63"; c.fillRect(0, 0, tw, th); c.fillStyle = "#C4683B"; c.fillRect(X(-o.length / 2), Z(-o.width / 2), o.length * PPM, o.width * PPM);
  c.fillStyle = "#A9532B"; for (const s of [-1, 1]) c.fillRect(Math.min(X(s * o.length / 2), X(s * (o.length / 2 - o.key.l))), Z(-o.key.w / 2), o.key.l * PPM, o.key.w * PPM);       // the painted keys
  c.strokeStyle = "#F7F5EE"; c.lineWidth = 0.1 * PPM;
  for (const l of L.lines) {
    c.beginPath();
    if (l.kind === "rect") c.rect(X(l.x0), Z(l.z0), (l.x1 - l.x0) * PPM, (l.z1 - l.z0) * PPM);
    else if (l.kind === "line") { c.moveTo(X(l.x0), Z(l.z0)); c.lineTo(X(l.x1), Z(l.z1)); }
    else if (l.kind === "circle") c.arc(X(l.x), Z(l.z), l.r * PPM, l.half ? (l.half > 0 ? -Math.PI / 2 : Math.PI / 2) : 0, l.half ? (l.half > 0 ? Math.PI / 2 : 3 * Math.PI / 2) : Math.PI * 2);
    else { const a = Math.asin((o.width / 2 - 0.9) / l.r), base = l.side > 0 ? 0 : Math.PI; c.arc(X(l.x), Z(l.z), l.r * PPM, base - a, base + a); }                // the three-point arc: the part of the circle round the hoop that lies inside the court
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(o.length + 2 * o.apron, o.width + 2 * o.apron), new THREE.MeshLambertMaterial({ map: tex })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.09; floor.receiveShadow = true; g.add(floor);
  const steel = new THREE.MeshLambertMaterial({ color: "#6B7078" }), board = new THREE.MeshLambertMaterial({ color: "#F4F4F2" }), rim = new THREE.MeshLambertMaterial({ color: "#D9531E" });
  for (const hp of L.hoops) {
    const s = hp.side, px = hp.x + s * 1.4, pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), steel); pole.position.set(px, 1.7, 0); pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), steel); arm.position.set(hp.x + s * 0.8, 3.3, 0); g.add(arm);
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.8), board); bd.position.set(hp.x + s * 0.15, 3.4, 0); bd.castShadow = true; g.add(bd);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 16), rim); ring.rotation.x = Math.PI / 2; ring.position.set(hp.x - s * 0.4, o.rim, 0); g.add(ring);
  }
  g.position.set((cfg.at[0] - W / 2) * K, 0, (cfg.at[1] - H / 2) * K); g.rotation.y = -(cfg.angle * Math.PI) / 180; g.scale.setScalar(o.scale);
  return g;
}
