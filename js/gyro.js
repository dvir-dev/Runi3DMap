// Opt-in device-orientation control: turning the phone turns the map, tilting it tilts the camera.
export function createGyro({ controls, onState }) {
  const has = "DeviceOrientationEvent" in window;
  let on = false, base = null, cur = { yaw: 0, pitch: 0.9 }, paused = false, seen = false;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), rad = d => d * Math.PI / 180;

  function handle(e) {
    if (e.alpha == null && e.beta == null) return;         // desktop browsers fire one empty event
    seen = true; if (paused) return;
    const alpha = e.webkitCompassHeading != null ? -e.webkitCompassHeading : (e.alpha ?? 0);
    const b = rad(e.beta ?? 0), g = rad(e.gamma ?? 0);
    const nz = clamp(Math.cos(b) * Math.cos(g), -1, 1);       // vertical component of the screen normal: 1 = lying flat, 0 = upright
    const elev = clamp(Math.asin(nz), controls.LIM.minPitch, controls.LIM.maxPitch);
    if (!base) base = { alpha, yaw: controls.st.yaw };
    const targetYaw = base.yaw + rad(alpha - base.alpha);
    const dy = ((targetYaw - cur.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;   // shortest way round
    cur.yaw += dy * 0.14; cur.pitch += (elev - cur.pitch) * 0.14;
    controls.setYawPitch(cur.yaw, cur.pitch);
  }
  return {
    supported: has,
    get on() { return on; },
    async enable() {
      if (!has) throw new Error("none");
      if (typeof DeviceOrientationEvent.requestPermission === "function") { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") throw new Error("denied"); }
      base = null; cur = { yaw: controls.st.yaw, pitch: controls.st.pitch }; on = true; paused = false;
      window.addEventListener("deviceorientation", handle); onState(true);
      setTimeout(() => { if (on && !seen) { this.disable(); onState(false, "none"); } }, 1500);
    },
    disable() { on = false; window.removeEventListener("deviceorientation", handle); onState(false); },
    pause() { paused = true; }, resume() { if (!on) return; paused = false; base = null; cur = { yaw: controls.st.yaw, pitch: controls.st.pitch }; },
  };
}
