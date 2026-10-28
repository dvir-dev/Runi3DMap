// A render loop that cannot wedge: frames only run once the app is ready, never while the page is hidden,
// and an exception in a frame is reported and leaves the loop restartable by the next invalidate().
export function createRenderLoop({ raf, isHidden, ready, frame, onStop = () => {}, onError = console.error }) {
  let running = false;
  function tick(now) {
    if (isHidden()) { running = false; onStop(); return; }
    if (!ready()) { running = false; return; }                     // too early (e.g. the page became visible while still loading)
    let again = false;
    try { again = frame(now); } catch (e) { running = false; onError(e); return; }
    if (again) raf(tick); else { running = false; onStop(); }
  }
  return { invalidate() { if (!running && !isHidden()) { running = true; raf(tick); } } };
}
