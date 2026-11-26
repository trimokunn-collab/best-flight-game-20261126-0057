// SKY RUSH — Island Courier: tuning constants and mission definitions.
// One source of truth for numbers the flight model, the world and the
// scoring all share, so a mission can be rebalanced by editing this file.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// World: a long island chain, sea level y = 0, up is positive.
export const WORLD_LENGTH = 12000;
export const SEA_LEVEL = 0;

// Feet / knots shown on the HUD for one world pixel / pixel-per-second.
export const FT_PER_PX = 2;
export const KT_PER_PX_S = 0.5;

// Flight model tuning.
export const FLIGHT = {
  maxSpeed: 400,        // px/s at full throttle, level
  cruiseSpeed: 250,     // px/s at 0.62 throttle, level
  stallSpeed: 150,      // px/s: below this the wing gives up
  thrust: 260,          // px/s^2 at full throttle
  drag: 0.65,           // 1/s, quadratic-ish drag factor
  maxPitch: 26,         // degrees, elevator authority
  pitchRate: 95,        // degrees/s the nose follows the stick
  climbFactor: 0.9,     // how much of sin(pitch) * speed becomes climb
  stallSink: 190,       // px/s^2 extra sink when stalled
  turnTime: 1.4,        // seconds a 180-degree turn takes
  fuelBurnBase: 0.22,   // fuel/s at idle
  fuelBurnThrottle: 0.62, // extra fuel/s at full throttle
  fuelStart: 100,
  hullStart: 100,
  birdDamage: 14,
  stormDamage: 9,       // per second inside a storm core
  terrainDamage: 34,
};

// Landing judgement (touchdown on a runway strip).
export const LANDING = {
  maxSink: 62,          // px/s downward at touchdown for a clean landing
  hardSink: 130,        // above this the touchdown is a crash
  minSpeed: 115,        // px/s: slower and she drops short
  maxSpeed: 285,        // px/s: faster and she floats past the strip
  goodCenter: 90,       // px from strip centre for full centreline points
};

// Scoring.
export const SCORE = {
  ring: 100,
  parcelMax: 150,       // scaled by accuracy
  fuelCan: 40,
  landingBase: 300,
  landingQuality: 200,  // extra for a soft, centred touchdown
  timeBonusPerSec: 4,   // under par time
  fuelBonusPerUnit: 3,
};

export const STAR_THRESHOLDS = [500, 900, 1300];

// Palettes: one coherent flat-vector look per mission.
export const PALETTES = {
  morning: {
    skyTop: '#2f7fd0', skyMid: '#7ec3ee', skyLow: '#d9f0fb',
    sun: '#fff3c4', sunGlow: 'rgba(255, 243, 196, 0.55)',
    sea: '#1d7fb8', seaDeep: '#14608f', sand: '#ecd9a0',
    grass: '#5da24a', grassDark: '#47873a', hill: '#6fae5f', mountain: '#7d9cc4',
    cloud: 'rgba(255,255,255,0.92)', cloudShade: 'rgba(210,230,245,0.9)',
    night: false, rain: false,
  },
  golden: {
    skyTop: '#5a4a9e', skyMid: '#e8805a', skyLow: '#ffd9a0',
    sun: '#ffdf8e', sunGlow: 'rgba(255, 190, 110, 0.6)',
    sea: '#7a5a9e', seaDeep: '#5d437e', sand: '#e8c890',
    grass: '#7d9a4a', grassDark: '#647d3c', hill: '#8aa85e', mountain: '#8d7bb0',
    cloud: 'rgba(255, 225, 200, 0.92)', cloudShade: 'rgba(240, 190, 160, 0.9)',
    night: false, rain: false,
  },
  storm: {
    skyTop: '#1c2438', skyMid: '#3d4a68', skyLow: '#6d7b9c',
    sun: '#e8ecf5', sunGlow: 'rgba(200, 210, 235, 0.25)',
    sea: '#233d5c', seaDeep: '#182c46', sand: '#b9a67e',
    grass: '#3f6b3f', grassDark: '#33582f', hill: '#4a7a4c', mountain: '#4c5a78',
    cloud: 'rgba(40, 48, 70, 0.95)', cloudShade: 'rgba(28, 34, 52, 0.95)',
    night: true, rain: true,
  },
};

// Missions. x/y are world pixels; y is height above sea level.
export const MISSIONS = [
  {
    id: 0,
    name: 'RING RUN',
    tag: 'Morning · calm',
    seed: 7,
    desc: 'Take off from Runway 09 on Barat Island, thread all six golden rings, and set her down on Runway 27 on Timur Island. Calm air, full tanks — a gentle first sortie.',
    runwayFrom: 'A', runwayTo: 'B',
    palette: 'morning',
    wind: 6, gust: 0,
    parTime: 75,
    rings: [
      { x: 1750, y: 430 }, { x: 3150, y: 500 }, { x: 5150, y: 470 },
      { x: 6800, y: 540 }, { x: 8450, y: 450 }, { x: 10150, y: 430 },
    ],
    dropZones: [],
    fuelCans: [],
    birds: 5,
    stormCells: [],
    returnLeg: false,
  },
  {
    id: 1,
    name: 'PARCEL DROP',
    tag: 'Golden hour · light wind',
    seed: 21,
    desc: 'Three villages are waiting on the mail. Fly the valley, press SPACE over each marked drop zone, and mind the parcels — a soft landing in the circle is worth more. Then land on Runway 27.',
    runwayFrom: 'A', runwayTo: 'B',
    palette: 'golden',
    wind: 12, gust: 4,
    parTime: 95,
    rings: [
      { x: 2400, y: 470 }, { x: 5900, y: 500 }, { x: 9200, y: 460 },
    ],
    dropZones: [
      { x: 3600, r: 150 }, { x: 6400, r: 150 }, { x: 9800, r: 150 },
    ],
    fuelCans: [{ x: 4800, y: 520 }, { x: 7900, y: 500 }],
    birds: 7,
    stormCells: [],
    returnLeg: false,
  },
  {
    id: 2,
    name: 'STORM COURIER',
    tag: 'Dusk storm · gusts',
    seed: 42,
    desc: 'The mail flies in any weather — even this one. Five rings through a dusk storm, fuel cans if you can reach them, then TURN AROUND (T) and bring her home to Runway 09, heading 270. Gusts will shove you around; fly the plane, not the wind.',
    runwayFrom: 'A', runwayTo: 'A',
    palette: 'storm',
    wind: 26, gust: 22,
    parTime: 130,
    rings: [
      { x: 1900, y: 450 }, { x: 3600, y: 520 }, { x: 5600, y: 480 },
      { x: 7800, y: 540 }, { x: 9900, y: 460 },
    ],
    dropZones: [],
    fuelCans: [{ x: 3000, y: 560 }, { x: 7000, y: 520 }, { x: 9400, y: 500 }],
    birds: 2,
    stormCells: [
      { x: 4300, y: 520, r: 260 }, { x: 6600, y: 560, r: 300 }, { x: 8900, y: 500, r: 240 },
    ],
    returnLeg: true,
  },
];

// Runway strips: flat ground the plane can land on.
export const RUNWAYS = {
  A: { x0: 350, x1: 950, y: 60, heading: 90, label: '09' },
  B: { x0: 11050, x1: 11650, y: 70, heading: 270, label: '27' },
};
