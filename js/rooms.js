// Room names like "C.B01", "A321", "PE 201" or "L-1204a": a building letter code, then a room that has a number in it (an optional floor letter before it, such as B for the
// basement, and an optional letter after). Typing a full room name finds its building. Letters typed on a Hebrew keyboard layout (ב for C, ש for A...) count as the Latin letter.
const RE = /^(PE|SL|[CALEHS])[\s.\-_]*(?:([A-Z]{1,2})[\s.\-_]*)?(\d{1,5})?([A-Z])?$/i, HEB = { ב: "C", ש: "A", ך: "L", ק: "E", י: "H", ד: "S", פ: "P", נ: "B", ם: "O", ן: "I", ל: "K", ג: "D", כ: "F", ע: "G", ח: "J", צ: "M", מ: "N", ה: "V", ס: "X", ז: "Z", ו: "U", ר: "R", א: "T", ט: "Y" };
const latin = input => { const t = String(input ?? ""); return /[A-Za-z]/.test(t) || !/[\u05d0-\u05ea]/.test(t) ? t : t.replace(/[\u05d0-\u05ea]/g, c => HEB[c] || c); };

// Returns { code, room, basement } for a known building code (optionally with a room), otherwise null.
export function parseRoom(input, codes) {
  const m = RE.exec(latin(input).trim());
  if (!m) return null;
  const [, code0, floor = "", digits = "", tail = ""] = m, code = code0.toUpperCase();
  if (!digits && (floor || tail)) return null;                                   // letters after the code with no number are a word ("cafe", "library"), not a room
  if (codes && !codes[code]) return null;
  const f = floor.toUpperCase();
  return { code, room: digits ? f + digits + tail.toUpperCase() : "", basement: f === "B" };
}

// Building code of a legend entry number, or "" when it has none.
export function codeOfEntry(n, codes) {
  for (const [code, b] of Object.entries(codes || {})) if (b.entries.includes(n)) return code;
  return "";
}

// The legend entries whose building has a letter code (C, A, L, E, PE, SL, H, S), as a Map entry number -> code: the pins the "lettered buildings" toggle keeps.
export function codedEntries(codes) {
  const m = new Map(); for (const [code, b] of Object.entries(codes || {})) for (const n of b.entries) if (!m.has(n)) m.set(n, code); return m;
}
