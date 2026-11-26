// SKY RUSH — Island Courier: the screenshot catalogue. Each entry is one
// deterministic game state the dossier ships with — the same seed, the same
// frame, every run. The harness loads index.html with these query params
// and screenshots the result.

export const SHOTS = [
  {
    name: '1-start',
    shot: 'menu',
    seed: 7,
    caption: 'The menu over the home runway — three missions, pick your sortie.',
  },
  {
    name: '2-play',
    shot: 'fly',
    seed: 7,
    caption: 'Mid-flight on Ring Run: two rings banked, the HUD lit, islands below.',
  },
  {
    name: '3-land',
    shot: 'land',
    seed: 7,
    caption: 'Final approach to Runway 27 — gear down, on the glide path.',
  },
  {
    name: '4-complete',
    shot: 'complete',
    seed: 7,
    caption: 'Debrief: six rings, a clean landing, three stars.',
  },
];

export function shotUrl(base, entry) {
  return base + '?shot=' + entry.shot + '&seed=' + entry.seed;
}
