// Seeded randomness for Laguna Brava. One mulberry32 stream per job (world building, traffic,
// weather, names) so the world is identical on every visit for a given seed, while gameplay
// streams stay independent of each other: a player who dawdles at the diner does not reshuffle
// the swamp. Every generator here is a plain function of its own hidden state; nothing reads
// Math.random, so a staged screenshot scene can rebuild the exact frame it staged last time.

/** A mulberry32 generator: next() returns a float in [0, 1). */
export function createRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Integer in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p (default one half). */
    chance(p = 0.5) {
      return next() < p;
    },
    /** One element of the array, or undefined for an empty one. */
    pick(items) {
      if (items.length === 0) return undefined;
      return items[Math.floor(next() * items.length)];
    },
    /** A shuffled copy of the array; the input is left alone. */
    shuffled(items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },
    /** Sign of a coin flip: -1 or 1. */
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
  };
}

/** Hash a string seed (a district name, a save slot) into a uint32 for createRng. */
export function seedFromString(text) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between a and b by t in [0, 1]. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Shortest signed turn from angle a to angle b, in radians, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Turn angle `a` toward `b` by at most `step` radians. */
export function turnToward(a, b, step) {
  const d = angleDelta(a, b);
  if (Math.abs(d) <= step) return b;
  return a + Math.sign(d) * step;
}

/** Euclidean distance between two points. */
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance from point (px, py) to the segment (x1, y1)-(x2, y2). */
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}
