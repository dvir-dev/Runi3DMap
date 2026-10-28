// Low-poly instanced trees (round and cone) placed where the poster draws trees.
import { K, pointInPoly } from "./geo.js";
import { hillTreePositions } from "./hill.js";

/** Drop trees whose centre lies inside a building polygon. */
export function filterTrees(trees, buildings) {
  return trees.filter(t => !buildings.some(b => pointInPoly(t.c, b.poly)));
}

const hash = i => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
/** Deterministic look of tree i: {kind:"round"|"cone", scale:0.8..1.3, tone:0..1} (~70% round). */
export function treeVariant(i) {
  return { kind: hash(i * 3) < 0.7 ? "round" : "cone", scale: 0.8 + hash(i * 3 + 1) * 0.5, tone: hash(i * 3 + 2) };
}

/** hill (optional): trees on that lawn are dropped and exactly 3 stand on the hill instead */
export function createTrees(THREE, data, W, H, rect, hill, pit) {
  const wx = px => (px - W / 2) * K, wz = py => (py - H / 2) * K;
  const group = new THREE.Group();
  const all = hill ? data.trees.filter((_, i) => !hill.drop.includes(i)).concat(hillTreePositions(hill)) : data.trees;
  const trees = filterTrees(all, data.buildings).filter(t => !(pit || []).some(poly => pointInPoly(t.c, poly))).filter(t => { const x = wx(t.c[0]), z = wz(t.c[1]); return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ; });
  const tinted = (geo, hex) => { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); return geo; };
  const merge = (geos) => { const pos = [], col = []; for (const g of geos) { const gg = g.index ? g.toNonIndexed() : g; pos.push(...gg.attributes.position.array); col.push(...gg.attributes.color.array); } const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); m.computeVertexNormals(); return m; };
  const trunk = h => tinted(new THREE.CylinderGeometry(0.28, 0.4, h, 6).translate(0, h / 2, 0), "#7A5A3A");
  const roundGeo = merge([trunk(1.4), tinted(new THREE.IcosahedronGeometry(1.15, 0).translate(0, 2.2, 0), "#4F9A86")]);
  const coneGeo = merge([trunk(0.9), tinted(new THREE.ConeGeometry(1.05, 2.8, 6).translate(0, 2.3, 0), "#2E7A6B")]);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const round = [], cone = [];
  trees.forEach((t, i) => (treeVariant(i).kind === "round" ? round : cone).push([t, treeVariant(i)]));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (const [list, geo] of [[round, roundGeo], [cone, coneGeo]]) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([t, v], i) => {
      const s = Math.max(2.2, Math.min(5.5, t.r * K * 0.55)) * v.scale;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i + 7) * Math.PI * 2);
      m4.compose(new THREE.Vector3(wx(t.c[0]), t.y ?? 0.02, wz(t.c[1])), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4);
      const g = 0.82 + v.tone * 0.32; im.setColorAt(i, col.setRGB(g, g, g));
    });
    im.castShadow = true; group.add(im);
  }
  return group;
}
