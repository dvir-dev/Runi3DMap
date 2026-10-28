// The diorama: a rounded ground tile on a thick slab (cream walls fading to Reichman blue, green rim), a soft contact
// shadow, and the light-blue background. Everything is in world units (~metres); the tile sits on y = 0.
import { punchHole } from "./sunken.js";
const BLUE = "#00378B", RIM = 0x7fb04a;

const roundedRect = (THREE, x, y, w, h, r) => {
  const s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
};
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tex = (THREE, c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };

/** Soft blue-tinted gradient used as scene.background (stretched over the screen). */
export function createBackground(THREE) {
  const c = canvas(4, 256), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#EAF0FB"); gr.addColorStop(1, "#F7F9FD");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  return tex(THREE, c);
}

/**
 * @param rect world-space tile rectangle {minX,maxX,minZ,maxZ}
 * @param groundTexture texture of the whole rect (top row = north / minZ)
 * @returns THREE.Group with userData.thickness
 */
export function createTile(THREE, { rect, groundTexture, hole }) {
  const w = rect.maxX - rect.minX, d = rect.maxZ - rect.minZ, cx = (rect.minX + rect.maxX) / 2, cz = (rect.minZ + rect.maxZ) / 2;
  const thick = Math.max(9, Math.min(w, d) * 0.06), rimW = Math.max(2, thick * 0.1), rimH = Math.max(1.6, thick * 0.14), radius = Math.min(w, d) * 0.012;
  const group = new THREE.Group(); group.userData.thickness = thick;
  // shape coordinates are (x, -z) so that rotateX(-90deg) lands them on the world's (x, z)
  const outer = () => roundedRect(THREE, rect.minX, -rect.maxZ, w, d, radius);

  // slab: side walls get a vertical gradient (cream -> Reichman blue in the lowest 28%)
  const sc = canvas(4, 256), sg = sc.getContext("2d"), sgr = sg.createLinearGradient(0, 0, 0, 256);
  sgr.addColorStop(0, "#F1EBDD"); sgr.addColorStop(0.55, "#E5DCC6"); sgr.addColorStop(0.72, "#D7D3C6"); sgr.addColorStop(0.74, BLUE); sgr.addColorStop(1, "#0A2F6E");
  sg.fillStyle = sgr; sg.fillRect(0, 0, 4, 256);
  const sideUV = { generateTopUV: (g, v, a, b, c) => [new THREE.Vector2(0, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)],
    generateSideWallUV: (g, v, a, b, c, dd) => [a, b, c, dd].map(i => new THREE.Vector2(0, v[i * 3 + 2] / thick)) };
  const slabGeo = new THREE.ExtrudeGeometry(outer(), { depth: thick, bevelEnabled: false, curveSegments: 6, UVGenerator: sideUV });
  slabGeo.rotateX(-Math.PI / 2); slabGeo.translate(0, -thick - 0.3, 0);   // top face sits just below the ground: no coplanar faces to z-fight
  const capMat = new THREE.MeshBasicMaterial({ color: 0xe5dcc6 });
  if (hole) punchHole(THREE, capMat, hole);             // the slab top is only 0.3 m below the ground: the sunken walkway has to cut through it too
  const slab = new THREE.Mesh(slabGeo, [capMat, new THREE.MeshBasicMaterial({ map: tex(THREE, sc) })]);
  group.add(slab);

  // green rim: a raised ring around the ground, flush with the slab walls
  const ring = roundedRect(THREE, rect.minX - 0.25, -rect.maxZ - 0.25, w + 0.5, d + 0.5, radius + 0.25); ring.holes.push(roundedRect(THREE, rect.minX + rimW, -rect.maxZ + rimW, w - 2 * rimW, d - 2 * rimW, Math.max(0.5, radius - rimW)));
  const rimGeo = new THREE.ExtrudeGeometry(ring, { depth: rimH + 0.5, bevelEnabled: false, curveSegments: 6 });
  rimGeo.rotateX(-Math.PI / 2); rimGeo.translate(0, -rimH, 0);
  group.add(new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: RIM, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));

  // ground: rounded rect, UVs span the whole rect (north = top of the texture)
  const gGeo = new THREE.ShapeGeometry(roundedRect(THREE, rect.minX + rimW, -rect.maxZ + rimW, w - 2 * rimW, d - 2 * rimW, Math.max(0.5, radius - rimW)), 6);
  const uv = gGeo.attributes.uv, pos = gGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - rect.minX) / w, (pos.getY(i) + rect.maxZ) / d);
  gGeo.rotateX(-Math.PI / 2); gGeo.translate(0, 0.02, 0);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTexture });
  if (hole) punchHole(THREE, groundMat, hole);          // the sunken walkway
  const ground = new THREE.Mesh(gGeo, groundMat);
  ground.userData.isGround = true; group.add(ground);

  // contact shadow on the "table" below the slab
  const sh = canvas(256, 256), shg = sh.getContext("2d"), grd = shg.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, "rgba(0,35,100,0.34)"); grd.addColorStop(0.55, "rgba(0,35,100,0.16)"); grd.addColorStop(1, "rgba(0,35,100,0)");
  shg.fillStyle = grd; shg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, d * 1.5), new THREE.MeshBasicMaterial({ map: tex(THREE, sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(cx, -thick - 0.4, cz); shadow.renderOrder = -3; group.add(shadow);
  return group;
}
