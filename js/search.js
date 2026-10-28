// Pure filtering of the locations list by category chip and search term (Hebrew + English text, or an exact entry number).
export function filterEntries(entries, { term = "", category = "all", categories }) {
  const t = term.trim().toLowerCase();
  const inCat = category === "all" || !categories ? entries : entries.filter(e => categories.entries[e.n] === category);
  if (!t) return inCat;
  if (/^\d+$/.test(t)) return inCat.filter(e => String(e.n) === t);
  return inCat.filter(e => [...e.he, ...e.en].join(" ").toLowerCase().includes(t));
}
