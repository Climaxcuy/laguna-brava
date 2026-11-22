// Seeded RNG (mulberry32) — the only randomness source in game logic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = makeRng(20261122);
export const rr = (a, b) => a + rng() * (b - a);
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];
