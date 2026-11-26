# STRUCTURE — SKY RUSH: Island Courier

Work dir (also the entry repository root):
```
best-flight-game-20261126-0057/
  PRD.md                 # this product plan (not part of the game)
  FEATURES.md            # feature checklist (not part of the game)
  STRUCTURE.md           # this file (not part of the game)
  main.ts                # entrypoint: copies game/ + screenshots/ to output,
                         #   writes dossier.json via vendor/makefun-game.ts
  serve.ts               # local static server for testing (node serve.ts)
  LICENSE                # MIT
  .makefun/owner.json    # {"wallet": "<agent wallet>"} (claim file)
  vendor/
    makefun-game.ts      # kit copy, byte-identical (copied by parent at assembly)
  game/
    index.html           # canvas + HUD shell, loads src/main.js as a module
    css/
      style.css          # all styling, local only (no CDN — the gate forbids it)
    src/
      config.js          # tuning constants + the three mission definitions
      random.js          # seeded RNG (deterministic worlds + screenshots)
      input.js           # keyboard, mouse, touch, on-screen buttons
      audio.js           # WebAudio synth: engine, wind, chimes, crashes
      world.js           # island chain, terrain, runways, rings, weather
      plane.js           # flight model: throttle, pitch, stall, turn, landing
      render.js          # canvas drawing: sky, terrain, plane, HUD, instruments
      game.js            # state machine, missions, scoring, collisions, saves
      shots.js           # deterministic ?shot= states for screenshots
      main.js            # boot: wire everything, resize, game loop
  screenshots/
    1-cover.png          # flight: plane + rings + runway ahead + HUD (cover)
    2-play.png           # parcel drop over a village
    3-land.png           # final approach, runway + instruments lit
    4-complete.png       # mission-complete debrief
  out/                   # built by `MAKEFUN_OUTPUT_DIR=out node main.ts` (test only)
```

## Load order (what the dossier shows)
`index.html` -> `src/main.js` -> `config, random, input, audio, world, plane,
render, game, shots` (static imports, depth-first).

## Why this split (judge criterion 5)
Every file has one clear job and a name that says it: config (tuning + missions),
random (seeded chance), input (controls), audio (sound), world (terrain + course),
plane (flight model), render (drawing + instruments), game (rules + score),
shots (screenshot states), main (boot). The outline the judge reads is mostly
these names.

## Notes
- No file under `game/` is copied from the kit starter or from the earlier
  cooking/heist entries. `vendor/makefun-game.ts` is the kit's file and must be
  copied byte-identical by the parent at assembly (the kit RULES instruct this);
  it is NOT authored by this session.
- `game/` stays under the gate caps: a handful of files, far below 993 files /
  48 MiB; `index.html` under 1 MiB; screenshots 4 x 1280x720 PNG, each under
  256 KiB.
- Testing lives outside the repo: `~/workspace/makefun/work-tmp/` holds the
  playwright test script and `~/workspace/makefun/tools-shots/` the browser.
