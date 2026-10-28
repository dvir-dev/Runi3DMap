// Pin decluttering: when zoomed out, badges that would sit on top of each other are thinned out, the most important one of each overlap staying (selected first, then lettered buildings,
// then by number). Pure: pickVisible takes the pins already on screen and returns the numbers to show.
/** items: [{n, x, y, rank}] screen positions of the badge centres (rank: lower = more important); minDist: the centre-to-centre distance below which two badges overlap. @returns {Set<number>} */
export function pickVisible(items, minDist) {
  const placed = [], shown = new Set(), min2 = minDist * minDist;
  for (const it of [...items].sort((a, b) => a.rank - b.rank || a.n - b.n)) {
    if (placed.some(p => (p.x - it.x) ** 2 + (p.y - it.y) ** 2 < min2)) continue;
    placed.push(it); shown.add(it.n);
  }
  return shown;
}
