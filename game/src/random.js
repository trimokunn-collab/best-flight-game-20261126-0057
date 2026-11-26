// SKY RUSH — Island Courier: a tiny seeded RNG so worlds, weather and
// screenshot states are deterministic for a given seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + next() * (max - min); },
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
  };
}

// A deterministic 1-D value-noise helper for terrain: smooth, repeatable.
export function noise1(x, seed) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const h = (n) => {
    let v = (n * 374761393 + seed * 668265263) | 0;
    v = (v ^ (v >> 13)) | 0;
    v = Math.imul(v, 1274126177);
    return (((v ^ (v >> 16)) >>> 0) % 10000) / 10000;
  };
  const a = h(xi), b = h(xi + 1);
  const u = xf * xf * (3 - 2 * xf);
  return a + (b - a) * u;
}
