// SKY RUSH — Island Courier: the island chain, its runways, the course
// (rings, drop zones, fuel cans, birds, storm cells) and the weather.
// Everything is seeded, so the same mission + seed always builds the same
// world — including the deterministic screenshot states.

import { RUNWAYS, WORLD_LENGTH } from './config.js';
import { makeRng, noise1 } from './random.js';

function smoothBump(x, center, halfWidth, height) {
  const d = Math.abs(x - center) / halfWidth;
  if (d >= 1) return 0;
  const u = 1 - d * d;
  return height * u * u;
}

function lerp(a, b, t) { return a + (b - a) * t; }

export function buildWorld(mission, seed) {
  const rng = makeRng(seed);
  const paletteKey = mission.palette;

  // --- terrain height above sea level, in world pixels ---
  function rawHeight(x) {
    let h = 0;
    h += smoothBump(x, 1250, 1350, 118);   // Barat island
    h += smoothBump(x, 5750, 1350, 152);   // Tengah island
    h += smoothBump(x, 10500, 1600, 128);  // Timur island
    h += (noise1(x * 0.004, seed) - 0.5) * 46;
    h += (noise1(x * 0.013, seed + 7) - 0.5) * 16;
    return Math.max(0, h);
  }

  function terrainHeight(x) {
    // Flatten the ground under each runway strip so landings are fair,
    // and ramp the terrain down to the strip over a wide pad — a plane
    // on final approach must meet a gentle slope, not a hillside wall.
    let h = rawHeight(x);
    for (const key of Object.keys(RUNWAYS)) {
      const r = RUNWAYS[key];
      const pad = 320;
      if (x > r.x0 - pad && x < r.x1 + pad) {
        const edge = Math.min((x - (r.x0 - pad)) / pad, ((r.x1 + pad) - x) / pad, 1);
        const blend = edge < 0 ? 0 : (edge < 1 ? edge * edge * (3 - 2 * edge) : 1);
        h = lerp(r.y, h, 1 - blend);
        if (x >= r.x0 && x <= r.x1) h = r.y;
      }
    }
    return Math.max(0, h);
  }

  // --- villages: houses and palms on the islands ---
  const villages = [];
  const villageSpots = [1500, 5200, 6100, 9850, 10800];
  for (const vx of villageSpots) {
    const count = rng.int(4, 7);
    for (let i = 0; i < count; i++) {
      const hx = vx + rng.range(-190, 190);
      villages.push({
        x: hx,
        y: terrainHeight(hx),
        w: rng.range(26, 44),
        h: rng.range(20, 34),
        roof: rng.pick(['#c25b4a', '#d08a3e', '#7a6a9e', '#4a7a9e']),
        wall: rng.pick(['#f2e6c9', '#e8d9b0', '#f5efe0']),
      });
    }
    for (let i = 0; i < rng.int(5, 9); i++) {
      const px = vx + rng.range(-260, 260);
      villages.push({ x: px, y: terrainHeight(px), palm: true, lean: rng.range(-0.25, 0.25) });
    }
  }

  // --- clouds in two parallax layers ---
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: rng.range(0, WORLD_LENGTH),
      y: rng.range(430, 880),
      s: rng.range(0.7, 1.9),
      layer: rng.pick([0, 0, 1]),
      drift: rng.range(2, 9),
    });
  }
  // Far mountain silhouettes.
  const mountains = [];
  for (let i = 0; i < 14; i++) {
    mountains.push({
      x: i * 920 + rng.range(-160, 160),
      w: rng.range(380, 720),
      h: rng.range(150, 320),
    });
  }

  // --- course objects from the mission definition ---
  const rings = mission.rings.map((r, i) => ({
    x: r.x, y: r.y, r: 56, index: i, passed: false,
  }));
  const dropZones = mission.dropZones.map((z) => ({
    x: z.x, r: z.r, done: false, parcels: 0, best: null,
  }));
  const fuelCans = mission.fuelCans.map((c) => ({
    x: c.x, y: c.y, taken: false, bob: rng.range(0, Math.PI * 2),
  }));
  const stormCells = mission.stormCells.map((s) => ({
    x: s.x, y: s.y, r: s.r, drift: rng.range(-6, 6),
  }));
  const birds = [];
  for (let i = 0; i < mission.birds; i++) {
    birds.push({
      x: rng.range(2000, 10500),
      y: rng.range(300, 620),
      vx: rng.pick([-1, 1]) * rng.range(18, 42),
      phase: rng.range(0, Math.PI * 2),
      alive: true,
    });
  }

  const world = {
    mission,
    seed,
    paletteKey,
    terrainHeight,
    villages,
    clouds,
    mountains,
    rings,
    dropZones,
    fuelCans,
    stormCells,
    birds,
    wind: mission.wind,
    gust: mission.gust,
    gustPhase: 0,
    gustValue: 0,
    time: 0,
    // Wind gusts: a slow wandering value the storm mission leans on.
    update(dt) {
      this.time += dt;
      this.gustPhase += dt;
      const g = Math.sin(this.gustPhase * 0.9) * 0.6 + Math.sin(this.gustPhase * 2.3) * 0.4;
      this.gustValue = g * this.gust;
      for (const c of this.clouds) {
        c.x += (c.drift + this.wind * 0.4) * dt;
        if (c.x > WORLD_LENGTH + 400) c.x = -400;
        if (c.x < -400) c.x = WORLD_LENGTH + 400;
      }
      for (const s of this.stormCells) {
        s.x += s.drift * dt;
        if (s.x < 1500) { s.x = 1500; s.drift = Math.abs(s.drift); }
        if (s.x > WORLD_LENGTH - 1500) { s.x = WORLD_LENGTH - 1500; s.drift = -Math.abs(s.drift); }
      }
      for (const b of this.birds) {
        if (!b.alive) continue;
        b.x += b.vx * dt;
        b.phase += dt * 9;
        if (b.x < 800) { b.x = 800; b.vx = Math.abs(b.vx); }
        if (b.x > WORLD_LENGTH - 800) { b.x = WORLD_LENGTH - 800; b.vx = -Math.abs(b.vx); }
      }
    },
    resetCourse() {
      for (const r of this.rings) r.passed = false;
      for (const z of this.dropZones) { z.done = false; z.parcels = 0; z.best = null; }
      for (const c of this.fuelCans) c.taken = false;
      for (const b of this.birds) b.alive = true;
    },
  };
  return world;
}
