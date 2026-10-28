// Frame-rate cap for the continuous animation loop (student walking). Pure; the caller passes the rAF timestamp.
export function createFrameGate(maxFps) {
  const min = (1000 / maxFps) * 0.9;           // 10% slack so a 60 Hz display really delivers 30 fps
  let last = -Infinity;
  return { ready(nowMs) { if (last === -Infinity || nowMs < last || nowMs - last >= min) { last = nowMs; return true; } return false; } };
}
