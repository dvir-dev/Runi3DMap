// Installable-web-app helpers: service worker registration and the one-time iOS "Add to Home Screen" hint.
const IOS = /iPhone|iPad|iPod/, OTHER_IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//;

/** True only in iPhone/iPad Safari (other iOS browsers cannot install), when not already installed and not dismissed. */
export function shouldShowIosHint({ ua, standalone, dismissed }) {
  return IOS.test(ua) && /Safari/.test(ua) && !OTHER_IOS_BROWSER.test(ua) && !standalone && !dismissed;
}

/** Register sw.js (secure origins and localhost only). Never throws. */
export async function registerPwa() {
  if (!("serviceWorker" in navigator) || !(isSecureContext || location.hostname === "localhost")) return;
  let had = !!navigator.serviceWorker.controller, reloaded = false;     // a new version took over: reload once so the page and its files match
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !reloaded) { reloaded = true; location.reload(); } had = true; });
  try { await navigator.serviceWorker.register("sw.js", { scope: "./" }); } catch (e) { console.warn("service worker not registered: " + e.message); }
}
