// Picks rendering quality from what the device can do. Phones (coarse pointer or a narrow window) get the lighter profile.
/** @param env {coarse:boolean, dpr:number, width:number, memory?:number (navigator.deviceMemory, undefined on iOS), maxTexture:number} */
export function pickProfile({ coarse, dpr, width, memory, maxTexture }) {
  const phone = coarse || width <= 900, lowMem = memory !== undefined && memory <= 4;
  if (phone) return { dprCap: Math.min(dpr, lowMem ? 1.5 : 2), students: lowMem ? 35 : 50, groundVariant: "half", shadowSize: 1024 };
  return { dprCap: Math.min(dpr, 2), students: 120, groundVariant: maxTexture < 8192 ? "half" : "full", shadowSize: 2048 };
}
