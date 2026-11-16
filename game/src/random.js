// Lumen Drift — small seeded random helpers.
// One clear job: deterministic randomness for waves and screenshot scenes,
// so the same seed always builds the same sky.

/** mulberry32: a tiny fast seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random source with the helpers the world uses. */
export function makeRandom(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Integer in [min, max]. */
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    /** One element of an array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** Angle in [0, 2π). */
    angle() {
      return next() * Math.PI * 2;
    },
  };
}
