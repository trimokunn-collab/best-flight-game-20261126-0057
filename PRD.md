# PRD — SKY RUSH: Island Courier

## One-liner
A complete 2D side-view flight game for the make.fun "best flight game" bounty: you are a courier pilot for the fictional Cendrawasih Air, flying a prop plane between island airstrips — take off, fly the course, and bring her home.

## Why this game wins
The judge's first criterion is explicit: a cockpit or chase view over recognisable
terrain, the aircraft in frame with instruments lit, a runway or a target ring ahead,
and altitude, speed and heading on the HUD. SKY RUSH is built around exactly that
shot: a chase view over an island chain, a drawn prop plane with a spinning propeller
and nav lights, a lit instrument panel (attitude indicator, airspeed, altimeter,
compass, fuel, hull), a runway ahead at both ends of every sortie, and target rings
on the course. The screenshots are the game itself, not a menu.

## Core fantasy
Island courier work: short hops, tight fuel, weather that changes its mind.
Every mission is a full sortie — take-off roll, climb, course, landing — never an
endless dodger. Landing is a skill: too fast or too steep and you bounce or break
the plane; too slow and you stall short of the strip.

## Platform and constraints
- Runs OFFLINE in desktop Chrome from static files under `game/` — no network
  request of any kind. No CDN, no external font, no external library. All art is
  drawn on canvas, all sound is synthesised with WebAudio. (The bounty gate
  forbids network loads, so Tailwind CDN is NOT used; styling is a local CSS file.)
- Keyboard + mouse + touch. Vanilla JS (ES modules), one clear job per file.
- Entry point `main.ts` (Node 22, stdlib only) copies `game/` + `screenshots/`
  to the output dir and writes `dossier.json` with the kit's `buildDossier`.

## Player experience
1. Menu: title, three mission cards with best scores and stars, controls, mute.
2. Briefing: mission goal, weather, runway, "press ENTER to fly".
3. Flying: chase view, parallax islands and sea, HUD + lit instruments, rings and
   drop zones ahead, fuel ticking down, wind gusts in the storm mission.
4. Landing: flare over the runway, touchdown quality scored, or a crash with a
   clear reason (terrain, stall, fuel, hull).
5. Debrief: score breakdown (rings, drops, landing, time, fuel), stars 1–3,
   best score saved, next mission / retry.

## Missions (different goals, one flight model)
1. **Ring Run** (morning, calm) — take off Runway 09, fly 6 golden rings, land
   Runway 27 on the far island.
2. **Parcel Drop** (golden hour) — 3 village drop zones; press SPACE to drop a
   parcel, accuracy is scored; land at the far runway.
3. **Storm Courier** (dusk storm) — 5 rings + fuel cans, gusty headwind and rain;
   fly out, turn around (T), land back home heading 270°.

## Feel targets
- Controls answer at every speed; throttle and pitch are the two decisions.
- Stall is telegraphed (shaker + warning + nose drop), never a surprise.
- Landings and crashes read as what happened (flare, bounce, smoke, fireball).
- 60 fps on a plain laptop: one canvas, no per-frame allocation in the hot loop.

## Success criteria (before reporting)
- Loads with zero console errors, offline, from a static server.
- All three missions are completable end-to-end by scripted play in a headless
  browser; screenshots show menu, flight, landing approach and debrief.
- `main.ts` builds the output (dossier via the kit library) once the kit's
  `vendor/makefun-game.ts` is present; screenshots are real renders, ≤256 KiB,
  1280×720.
- No file is copied from the cooking/heist references or the kit starter: all
  game code is written fresh in this session.
