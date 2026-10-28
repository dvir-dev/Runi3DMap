// DOM-side UI: language, info sheet, locations index, toasts.
import { STR } from "./i18n.js";
import { filterEntries } from "./search.js";
import { parseRoom, codeOfEntry } from "./rooms.js";
const $ = id => document.getElementById(id);

export function createUI({ data, categories, codes = {}, onSelectEntry, onCloseSheet, onLayout, onDirections = () => {}, onRouteFrom = () => {}, onRouteClear = () => {} }) {
  let lang = "he"; try { lang = localStorage.getItem("lang") || "he"; } catch {}
  if (!STR[lang]) lang = "he";
  const app = $("app"), sheet = $("sheet"), cards = $("cards"), routeEl = $("route"), index = $("index"), list = $("list"), q = $("q");
  const entryBy = new Map(data.entries.map(e => [e.n, e]));
  let currentN = null, shownGroup = [];

  const t = () => STR[lang];
  const lines = e => e[lang].length ? e[lang] : e[lang === "he" ? "en" : "he"];
  const title = e => lines(e)[0] || "";
  const badge = n => { const c = codeOfEntry(n, codes); return c ? `<span class="code" dir="ltr" title="${esc(t().building)} ${c}">${c}</span>` : ""; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---- static text
  function applyLang() {
    const s = t(); document.documentElement.lang = lang; document.documentElement.dir = s.dir; document.title = `${s.title} · ${lang === "he" ? "Campus Map" : "מפת הקמפוס"}`;
    $("title").textContent = s.title; $("subtitle").textContent = s.subtitle; $("btn-lang").textContent = s.lang; $("btn-lang").setAttribute("aria-label", s.langLabel);
    $("lbl-list").textContent = s.locations; $("q").placeholder = s.search; $("empty").textContent = s.none; $("loader-txt").textContent = s.loading; $("hint").textContent = s.hint; $("ios-hint-txt").textContent = s.iosHint;
    const label = (id, k) => { $(id).setAttribute("aria-label", s[k]); $(id).title = s[k]; };
    label("btn-zin", "zoomIn"); label("btn-zout", "zoomOut"); label("btn-north", "north"); label("btn-rot-l", "rotL"); label("btn-rot-r", "rotR"); label("btn-tilt", "tilt"); label("btn-gyro", "gyro"); label("btn-home", "home"); label("btn-codes", "codes"); label("btn-students", "students");
    $("sheet-close").setAttribute("aria-label", s.close); $("index-close").setAttribute("aria-label", s.close);
    renderChips(); renderList(); if (shownGroup.length) renderCards(shownGroup, currentN); renderRoute();
    onLayout();
  }
  function setLang(l) { lang = l; try { localStorage.setItem("lang", l); } catch {} applyLang(); }
  const toggleLang = () => setLang(lang === "he" ? "en" : "he");

  // ---- layout mode (portrait phone = bottom sheet, wide/landscape = side panel)
  function layout() {
    const side = innerWidth >= 700 && innerWidth > innerHeight * 0.85 || innerHeight < 480 && innerWidth > innerHeight;
    app.dataset.layout = side ? "side" : "bottom";
    const r = getComputedStyle(document.documentElement).getPropertyValue("--panel-w"); document.documentElement.style.setProperty("--panel-w", Math.min(380, Math.round(innerWidth * 0.42)) + "px");
    return side ? "side" : "bottom";
  }

  // ---- sheet
  function renderCards(group, activeN) {
    const s = t(); const ordered = [...group].sort((a, b) => (a.n === activeN ? -1 : b.n === activeN ? 1 : a.n - b.n));
    cards.innerHTML = ordered.map((e, i) => {
      const L = lines(e), det = L.slice(1);
      const head = ordered.length > 1 && i === 1 ? `<div class="also">${esc(s.alsoHere)}</div>` : "";
      return `${head}<article class="card ${e.n === activeN ? "active" : "tappable"}" data-n="${e.n}"><div class="num">${e.n}</div><div><h2>${badge(e.n)}${esc(L[0] || "")}</h2>${det.length ? `<ul>${det.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}${e.n === activeN ? `<button type="button" class="go" data-go="${e.n}">${esc(s.dirBtn)}</button>` : ""}</div></article>`;
    }).join("");
    cards.scrollTop = 0;
  }
  cards.addEventListener("click", e => { const g = e.target.closest("button.go"); if (g) return onDirections(+g.dataset.go); const c = e.target.closest(".card.tappable"); if (c) onSelectEntry(+c.dataset.n, { fly: false }); });

  // ---- walking directions panel: a start picker, the distance and time, and a button to clear it
  let routeState = null;
  function renderRoute() {
    if (!routeState) { routeEl.hidden = true; routeEl.innerHTML = ""; return; }
    const s = t(), r = routeState, opts = data.entries.map(e => `<option value="${e.n}"${e.n === r.from ? " selected" : ""}>${e.n} · ${esc(title(e))}</option>`).join("");
    const msg = r.state === "ok" ? s.dirSummary(r.stats.meters, r.stats.minutes) : r.state === "busy" ? s.dirBusy : r.state === "here" ? s.dirHere : s.dirNone;
    routeEl.innerHTML = `<label><span>${esc(s.dirFrom)}</span><select id="route-from">${opts}</select></label><div class="sum ${r.state}">${esc(msg)}</div><button type="button" id="route-clear">${esc(s.dirClear)}</button>`;
    routeEl.hidden = false;
  }
  routeEl.addEventListener("change", e => { if (e.target.id === "route-from") onRouteFrom(+e.target.value); });
  routeEl.addEventListener("click", e => { if (e.target.closest("#route-clear")) onRouteClear(); });
  const showRoute = r => { routeState = r; renderRoute(); }, hideRoute = () => { routeState = null; renderRoute(); };

  function showSheet(group, activeN) {
    shownGroup = group; currentN = activeN; renderCards(group, activeN);
    sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add("open"));
  }
  function hideSheet() { shownGroup = []; currentN = null; hideRoute(); sheet.classList.remove("open"); setTimeout(() => { if (!sheet.classList.contains("open")) sheet.hidden = true; }, 330); }
  const sheetOpen = () => sheet.classList.contains("open");
  // measured obstruction of the sheet, so the camera can keep the focus visible
  function obstruction() { if (!sheetOpen() && sheet.hidden) return { x: 0, y: 0 }; const r = sheet.getBoundingClientRect(); const side = app.dataset.layout === "side";
    return side ? { x: (document.documentElement.dir === "rtl" ? 1 : -1) * r.width / 2, y: 0 } : { x: 0, y: Math.min(r.height, innerHeight * 0.48) / 2 - 20 }; }
  $("sheet-close").addEventListener("click", onCloseSheet);

  // drag the handle down to dismiss
  { const h = $("sheet-handle"); let y0 = null, dy = 0;
    h.addEventListener("pointerdown", e => { y0 = e.clientY; dy = 0; h.setPointerCapture(e.pointerId); sheet.style.transition = "none"; });
    h.addEventListener("pointermove", e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
    const up = () => { if (y0 == null) return; y0 = null; sheet.style.transition = ""; sheet.style.transform = ""; if (dy > 70) onCloseSheet(); };
    h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up); }

  // ---- index
  let category = "all";
  const chips = $("chips");
  function renderChips() {
    if (!categories) { chips.hidden = true; return; }
    chips.innerHTML = categories.order.map(c => `<button type="button" role="tab" data-c="${c}" class="${c === category ? "on" : ""}" aria-selected="${c === category}">${esc(t().cat[c])}</button>`).join("");
  }
  chips.addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (!b) return; category = b.dataset.c; renderChips(); renderList(); list.scrollTop = 0; });
  function renderList() {
    const room = parseRoom(q.value, codes), b = room && codes[room.code];
    const rows = b ? b.entries.map(n => entryBy.get(n)).filter(Boolean) : filterEntries(data.entries, { term: q.value, category, categories });
    const s = t(), he = lang === "he";
    const roomCard = b ? `<li class="room"><button type="button" data-n="${b.entries[0]}"><span class="code big" dir="ltr">${room.code}</span><span><div class="name">${esc(s.building)} ${room.code} · ${esc(he ? b.he : b.en)}</div><div class="sub">${room.room ? `<b dir="ltr">${esc(s.room)} ${esc(room.room)}</b>${room.basement ? " · " + esc(s.basement) : ""} · ` : ""}${esc(he ? b.whereHe : b.whereEn)}</div></span></button></li>` : "";
    list.innerHTML = roomCard + rows.map(e => { const L = lines(e); return `<li><button type="button" data-n="${e.n}"><span class="num">${e.n}</span><span><div class="name">${badge(e.n)}${esc(L[0] || "")}</div>${L[1] ? `<div class="sub">${esc(L.slice(1).join(" · "))}</div>` : ""}</span></button></li>`; }).join("");
    $("empty").hidden = rows.length > 0 || !!b;
  }
  list.addEventListener("click", e => { const b = e.target.closest("button[data-n]"); if (!b) return; closeIndex(); onSelectEntry(+b.dataset.n, { fly: true }); });
  q.addEventListener("input", renderList);
  function openIndex() { index.hidden = false; requestAnimationFrame(() => index.classList.add("open")); if (matchMedia("(hover:hover)").matches) setTimeout(() => q.focus(), 300); }
  function closeIndex() { index.classList.remove("open"); q.blur(); setTimeout(() => { if (!index.classList.contains("open")) index.hidden = true; }, 320); }
  const indexOpen = () => index.classList.contains("open");
  $("btn-list").addEventListener("click", () => indexOpen() ? closeIndex() : openIndex());
  $("index-close").addEventListener("click", closeIndex);
  $("btn-lang").addEventListener("click", toggleLang);

  let toastT = 0;
  function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600); }

  return { applyLang, layout, showSheet, hideSheet, showRoute, hideRoute, sheetOpen, obstruction, openIndex, closeIndex, indexOpen, toast, t, get lang() { return lang; }, entryBy, title };
}
